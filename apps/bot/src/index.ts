import { Telegraf, Context } from 'telegraf';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || 'DUMMY_TOKEN';
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

const prisma = new PrismaClient();

if (BOT_TOKEN === 'DUMMY_TOKEN') {
  console.warn('WARNING: BOT_TOKEN is not defined in .env file. Running in dummy mode for testing.');
}

const bot = new Telegraf(BOT_TOKEN);

// ==================== HTML ESCAPE HELPER ====================

function esc(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ==================== TIMEZONE HELPERS ====================

function getKyivNow(): Date {
  const now = new Date();
  const kyivStr = now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
  return new Date(kyivStr);
}

function getKyivTodayUTC(): Date {
  const kyiv = getKyivNow();
  return new Date(Date.UTC(kyiv.getFullYear(), kyiv.getMonth(), kyiv.getDate()));
}

// ==================== DTEU BELL SCHEDULE ====================

const BELL_SCHEDULE = [
  { lesson: 1, start: '08:20', end: '09:40' },
  { lesson: 2, start: '10:05', end: '11:25' },
  { lesson: 3, start: '12:05', end: '13:25' },
  { lesson: 4, start: '13:50', end: '15:10' },
  { lesson: 5, start: '15:25', end: '16:45' },
  { lesson: 6, start: '17:00', end: '18:20' },
];

// ==================== DIRECT MESSAGE SENDER ====================

async function sendTelegramMessage(
  telegramId: string,
  message: string
): Promise<'sent' | 'blocked' | 'error'> {
  if (BOT_TOKEN === 'DUMMY_TOKEN') {
    console.log(`[Push] To ${telegramId}: ${message.substring(0, 80)}...`);
    return 'sent';
  }

  try {
    await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
    return 'sent';
  } catch (e: any) {
    if (e.response?.error_code === 403) {
      console.log(`[Bot] User ${telegramId} blocked the bot, skipping`);
      return 'blocked';
    }

    if (e.response?.error_code === 429) {
      const retryAfter = e.response.parameters?.retry_after || 1;
      console.warn(`[Bot] Rate limited, waiting ${retryAfter}s for ${telegramId}`);
      await new Promise((res) => setTimeout(res, retryAfter * 1000));

      try {
        await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
        return 'sent';
      } catch (retryErr: any) {
        console.error(`[Bot] Retry failed for ${telegramId}:`, retryErr.message);
        return 'error';
      }
    }

    console.error(`[Bot] Failed to send to ${telegramId}:`, e.message);
    return 'error';
  }
}

async function sendBulkMessages(
  messages: { telegramId: string; message: string }[]
): Promise<{ sent: number; blocked: number; errors: number }> {
  const BATCH_SIZE = 25;
  const BATCH_DELAY_MS = 1100;

  let sent = 0;
  let blocked = 0;
  let errors = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((msg) => sendTelegramMessage(msg.telegramId, msg.message))
    );

    for (const result of results) {
      if (result === 'sent') sent++;
      else if (result === 'blocked') blocked++;
      else errors++;
    }

    if (i + BATCH_SIZE < messages.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  return { sent, blocked, errors };
}

// ==================== BROADCAST QUEUE ====================

const broadcastQueue: { telegramId: string; message: string }[] = [];
let isBroadcasting = false;

const processBroadcast = async () => {
  if (isBroadcasting) return;
  isBroadcasting = true;

  while (broadcastQueue.length > 0) {
    const job = broadcastQueue.shift();
    if (job) {
      await sendTelegramMessage(job.telegramId, job.message);
      await new Promise((res) => setTimeout(res, 40));
    }
  }

  isBroadcasting = false;
};

const queueBroadcast = (telegramId: string, message: string) => {
  broadcastQueue.push({ telegramId, message });
  processBroadcast();
};

// ==================== SUBGROUP FILTER ====================

const SUB1_PATTERNS = ['підгр. 1', '1 підгр', 'п/г 1', '1 п/г', 'підгрупа 1', '1 підгрупа', 'пр 1.1'];
const SUB2_PATTERNS = ['підгр. 2', '2 підгр', 'п/г 2', '2 п/г', 'підгрупа 2', '2 підгрупа', 'пр 1.2'];

function shouldNotifyForSubgroup(subject: string, userSubgroup: number): boolean {
  if (userSubgroup === 0) return true;
  const lower = subject.toLowerCase();
  const isSub1Only = SUB1_PATTERNS.some((p) => lower.includes(p)) && !SUB2_PATTERNS.some((p) => lower.includes(p));
  const isSub2Only = SUB2_PATTERNS.some((p) => lower.includes(p)) && !SUB1_PATTERNS.some((p) => lower.includes(p));
  if (userSubgroup === 1 && isSub2Only) return false;
  if (userSubgroup === 2 && isSub1Only) return false;
  return true;
}

function filterLessonsBySubgroup(lessons: any[], subgroup: number): any[] {
  if (subgroup === 0) return lessons;
  return lessons.filter((l) => shouldNotifyForSubgroup(l.subject, subgroup));
}

// ==================== BOT COMMANDS ====================

bot.start((ctx: Context & { startPayload?: string }) => {
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  if (isGroup) {
    const botUsername = ctx.botInfo?.username || 'dteu_schedule_bot';
    const configLink = `https://t.me/${botUsername}?start=chat_${ctx.chat?.id}`;
    const groupMsg = [
      `<b>STUD IN · Груповий простір</b>`,
      ``,
      `Підключіть розсилку розкладу ДТЕУ для цього чату. Щоранку о <b>07:30</b> бот автоматично надсилатиме актуальні пари вашої групи.`,
      ``,
      `<blockquote>Натисніть кнопку нижче, щоб обрати факультет та академічну групу в особистих повідомленнях.</blockquote>`,
    ].join('\n');

    return ctx.reply(groupMsg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '⚙️ Налаштувати групу', url: configLink }]],
      },
    });
  }

  let url = WEB_APP_URL;

  if (ctx.startPayload && ctx.startPayload.startsWith('chat_')) {
    const chatId = ctx.startPayload.replace('chat_', '');
    url = url.includes('?') ? `${url}&chatId=${chatId}` : `${url}?chatId=${chatId}`;
    const setupMsg = [
      `<b>STUD IN · Налаштування чату групи</b>`,
      ``,
      `Оберіть свій факультет, курс та академічну групу ДТЕУ у застосунку нижче.`,
      ``,
      `<blockquote>Після збереження щоденний розклад автоматично надходитиме у ваш груповий чат.</blockquote>`,
    ].join('\n');

    return ctx.reply(setupMsg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '⚙️ Обрати групу для чату', web_app: { url } }]],
      },
    });
  }

  const welcomeMsg = [
    `<b>STUD IN</b> · Твій студентський простір`,
    ``,
    `Розклад занять, події та сервіси ДТЕУ в одному місці.`,
  ].join('\n');

  ctx.reply(welcomeMsg, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Відкрити STUD IN', web_app: { url } }]],
    },
  });
});

bot.help((ctx: Context) => {
  ctx.reply(`<b>STUD IN</b> · Усі налаштування та розклад доступні в застосунку 👇`, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Відкрити STUD IN', web_app: { url: WEB_APP_URL } }]],
    },
  });
});

bot.command('admin', (ctx: Context) => {
  const adminId = process.env.ADMIN_TG_ID || '';
  if (!adminId || ctx.from?.id.toString() !== adminId) return;

  const secret = process.env.ADMIN_SECRET || 'secret123';
  ctx.reply('🔐 <b>STUD IN · Адмін-панель</b>', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Відкрити Адмінку', web_app: { url: `${WEB_APP_URL}?admin=${encodeURIComponent(secret)}` } }],
      ],
    },
  });
});

bot.command('admin_broadcast_spam_fix', async (ctx: Context) => {
  const adminId = process.env.ADMIN_TG_ID || '';
  if (!adminId || ctx.from?.id.toString() !== adminId) return;

  ctx.reply('⏳ Розпочинаю розсилку...');

  try {
    const users = await prisma.user.findMany({
      where: { telegramId: { not: null } },
    });

    const msg = [
      `<b>STUD IN · Оновлення сповіщень</b>`,
      ``,
      `Систему сповіщень про зміни в розкладі оновлено. Повідомлення надходитимуть лише при реальних змінах у МІА.`,
    ].join('\n');

    let count = 0;
    for (const user of users) {
      if (user.telegramId) {
        queueBroadcast(user.telegramId.toString(), msg);
        count++;
      }
    }
    ctx.reply(`✅ Розсилку додано в чергу для ${count} користувачів.`);
  } catch (err) {
    console.error(err);
    ctx.reply('❌ Помилка під час розсилки.');
  }
});

// ==================== LESSON REMINDERS ====================

const notifyLessonsAtBell = async (bellStartTime: string, minutesAhead: number) => {
  const today = getKyivTodayUTC();

  console.log(`[Notify] Sending ${minutesAhead}m reminders for lessons starting at ${bellStartTime}`);

  try {
    const lessons = await prisma.scheduleItem.findMany({
      where: { date: today, startTime: bellStartTime },
      include: {
        group: {
          include: {
            students: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (lessons.length === 0) {
      console.log(`[Notify] No lessons at ${bellStartTime} today`);
      return;
    }

    const messagesToSend: { telegramId: string; message: string }[] = [];

    for (const lesson of lessons) {
      if (!lesson.group?.students) continue;

      for (const student of lesson.group.students) {
        const user = student.user;
        if (!user?.telegramId) continue;

        let shouldNotify =
          minutesAhead === 15 ? user.notify15Min : minutesAhead === 1 ? user.notify1Min : false;

        if (shouldNotify && user.preferences) {
          const prefs = user.preferences as any;
          const subgroup = prefs.subgroup || 0;
          shouldNotify = shouldNotifyForSubgroup(lesson.subject, subgroup);
        }

        if (shouldNotify) {
          const minText = minutesAhead === 1 ? '1 хвилину' : '15 хвилин';
          const message = [
            `🔔 <b>Нагадування · через ${minText}</b>`,
            ``,
            `<b>${esc(lesson.subject)}</b>`,
            `<blockquote>🕒  ${esc(lesson.startTime)} — ${esc(lesson.endTime)} (${lesson.lessonNumber} пара)\n📍  ${esc(lesson.classroom || 'Онлайн')}\n👤  ${esc(lesson.teacher || 'Викладач не вказаний')}</blockquote>`,
          ].join('\n');

          messagesToSend.push({
            telegramId: user.telegramId.toString(),
            message,
          });
        }
      }
    }

    if (messagesToSend.length === 0) return;

    console.log(`[Notify] Sending ${messagesToSend.length} notifications for ${bellStartTime}`);
    const result = await sendBulkMessages(messagesToSend);
    console.log(`[Notify] Done: ${result.sent} sent, ${result.blocked} blocked, ${result.errors} errors`);
  } catch (err) {
    console.error(`[Notify] Error sending ${minutesAhead}m reminders for ${bellStartTime}:`, err);
  }
};

function scheduleBellReminders() {
  console.log('[Notify] Setting up bell schedule reminders:');

  for (const bell of BELL_SCHEDULE) {
    const [startH, startM] = bell.start.split(':').map(Number);

    const remind15 = new Date(2000, 0, 1, startH, startM);
    remind15.setMinutes(remind15.getMinutes() - 15);
    const cron15 = `${remind15.getMinutes()} ${remind15.getHours()} * * *`;

    cron.schedule(
      cron15,
      () => {
        notifyLessonsAtBell(bell.start, 15);
      },
      { timezone: 'Europe/Kyiv' }
    );

    const remind1 = new Date(2000, 0, 1, startH, startM);
    remind1.setMinutes(remind1.getMinutes() - 1);
    const cron1 = `${remind1.getMinutes()} ${remind1.getHours()} * * *`;

    cron.schedule(
      cron1,
      () => {
        notifyLessonsAtBell(bell.start, 1);
      },
      { timezone: 'Europe/Kyiv' }
    );
  }
}

scheduleBellReminders();

// ==================== MORNING SUMMARY ====================

cron.schedule(
  '30 7 * * *',
  async () => {
    const today = getKyivTodayUTC();

    console.log('[Morning] Sending morning summaries...');

    try {
      const users = await prisma.user.findMany({
        where: { notifyMorning: true, telegramId: { not: null } },
        include: { student: true },
      });

      const messagesToSend: { telegramId: string; message: string }[] = [];

      for (const user of users) {
        if (!user.student?.groupId || !user.telegramId) continue;

        let lessons = await prisma.scheduleItem.findMany({
          where: { groupId: user.student.groupId, date: today },
          orderBy: { lessonNumber: 'asc' },
        });

        if (user.preferences) {
          const prefs = user.preferences as any;
          const subgroup = prefs.subgroup || 0;
          lessons = filterLessonsBySubgroup(lessons, subgroup);
        }

        if (lessons.length > 0) {
          const lines: string[] = [
            `☀️ <b>Доброго ранку! Розклад на сьогодні:</b>`,
            ``,
          ];

          lessons.forEach((l) => {
            lines.push(
              `<blockquote><b>${l.lessonNumber} пара · ${esc(l.startTime)}–${esc(l.endTime)}</b>\n<b>${esc(l.subject)}</b>\n📍 ${esc(l.classroom || 'Онлайн')} · 👤 ${esc(l.teacher || 'Не вказано')}</blockquote>`
            );
          });

          messagesToSend.push({
            telegramId: user.telegramId.toString(),
            message: lines.join('\n'),
          });
        }
      }

      if (messagesToSend.length > 0) {
        const result = await sendBulkMessages(messagesToSend);
        console.log(`[Morning] Done: ${result.sent} sent, ${result.blocked} blocked, ${result.errors} errors`);
      }
    } catch (err) {
      console.error('Morning cron error:', err);
    }
  },
  { timezone: 'Europe/Kyiv' }
);

// ==================== SCHEDULE CHANGE NOTIFICATIONS ====================

cron.schedule(
  '*/10 * * * *',
  async () => {
    try {
      const changes = await prisma.scheduleChange.findMany({
        where: { notified: false },
        include: {
          group: {
            include: {
              students: {
                include: { user: true },
              },
            },
          },
        },
        orderBy: [{ groupId: 'asc' }, { date: 'asc' }],
      });

      if (changes.length === 0) return;

      const byGroup = new Map<string, typeof changes>();
      for (const c of changes) {
        const arr = byGroup.get(c.groupId) || [];
        arr.push(c);
        byGroup.set(c.groupId, arr);
      }

      const notifiedIds: string[] = [];
      const messagesToSend: { telegramId: string; message: string }[] = [];

      for (const [, groupChanges] of byGroup) {
        const group = groupChanges[0]?.group;
        if (!group) continue;

        const lines: string[] = [
          `⚡ <b>Оновлення розкладу · ${esc(group.name)}</b>`,
          ``,
        ];

        for (const c of groupChanges) {
          const dateStr = new Date(c.date).toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            weekday: 'short',
          });
          const icon = c.changeType === 'added' ? '🟢' : c.changeType === 'removed' ? '🔴' : '🟡';
          const label =
            c.changeType === 'added' ? 'Додано' : c.changeType === 'removed' ? 'Скасовано' : 'Змінено';

          lines.push(
            `<blockquote>${icon} <b>${label}</b> (${esc(dateStr)})\n${c.lessonNumber ? `<b>${c.lessonNumber} пара:</b> ` : ''}${esc(c.subject || '')}</blockquote>`
          );

          notifiedIds.push(c.id);
        }

        const message = lines.join('\n');

        for (const student of group.students) {
          const user = student.user;
          if (user?.telegramId && (user as any).notifyChanges !== false) {
            messagesToSend.push({
              telegramId: user.telegramId.toString(),
              message,
            });
          }
        }
      }

      if (messagesToSend.length > 0) {
        await sendBulkMessages(messagesToSend);
      }

      if (notifiedIds.length > 0) {
        await prisma.scheduleChange.updateMany({
          where: { id: { in: notifiedIds } },
          data: { notified: true },
        });
      }
    } catch (err) {
      console.error('Schedule change notification error:', err);
    }
  },
  { timezone: 'Europe/Kyiv' }
);

// ==================== LAUNCH & SHUTDOWN ====================

bot.command('admin_turn_off_spam', async (ctx: Context) => {
  const adminId = process.env.ADMIN_TG_ID || '';
  if (!adminId || ctx.from?.id.toString() !== adminId) return;

  ctx.reply('🔄 Вимикаю сповіщення про зміни для всіх користувачів...');
  try {
    const res = await prisma.user.updateMany({
      data: { notifyChanges: false },
    });
    ctx.reply(`✅ Готово! Вимкнено для ${res.count} користувачів.`);
  } catch (e) {
    console.error(e);
    ctx.reply('❌ Помилка бази даних.');
  }
});

bot
  .launch()
  .then(() => {
    console.log('🤖 STUD IN Telegram bot is running...');
  })
  .catch(console.error);

const gracefulShutdown = async (signal: string) => {
  console.log(`[Bot] ${signal} received, shutting down...`);
  bot.stop(signal);
  await prisma.$disconnect();
  process.exit(0);
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
