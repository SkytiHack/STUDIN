import { Telegraf, Context } from 'telegraf';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || 'DUMMY_TOKEN';
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001';

const prisma = new PrismaClient();

if (BOT_TOKEN === 'DUMMY_TOKEN') {
  console.warn("WARNING: BOT_TOKEN is not defined in .env file. Running in dummy mode for testing.");
}

const bot = new Telegraf(BOT_TOKEN);

// ==================== TIMEZONE HELPERS ====================

/**
 * Get current date/time in Kyiv timezone.
 * This is critical — server may run in UTC, but schedule is in Europe/Kyiv.
 */
function getKyivNow(): Date {
  const now = new Date();
  const kyivStr = now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
  return new Date(kyivStr);
}

/**
 * Get today's date as UTC midnight Date object (for Prisma @db.Date queries).
 * Uses Kyiv timezone to determine "today".
 */
function getKyivTodayUTC(): Date {
  const kyiv = getKyivNow();
  return new Date(Date.UTC(kyiv.getFullYear(), kyiv.getMonth(), kyiv.getDate()));
}

// ==================== DTEU BELL SCHEDULE ====================
// Fixed bell schedule for DTEU (confirmed by user)
// These are the lesson start times

const BELL_SCHEDULE = [
  { lesson: 1, start: '08:20', end: '09:40' },
  { lesson: 2, start: '10:05', end: '11:25' },
  { lesson: 3, start: '12:05', end: '13:25' },
  { lesson: 4, start: '13:50', end: '15:10' },
  { lesson: 5, start: '15:25', end: '16:45' },
  { lesson: 6, start: '17:00', end: '18:20' },
];

// ==================== DIRECT MESSAGE SENDER (like dteubot) ====================

/**
 * Send a Telegram message directly with retry on rate limit.
 * Unlike the old queue approach, this sends immediately.
 * Handles 403 (bot blocked) by returning a flag.
 */
async function sendTelegramMessage(
  telegramId: string, 
  message: string
): Promise<'sent' | 'blocked' | 'error'> {
  if (BOT_TOKEN === 'DUMMY_TOKEN') {
    console.log(`[Push] To ${telegramId}: ${message.substring(0, 80)}...`);
    return 'sent';
  }

  try {
    await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    return 'sent';
  } catch (e: any) {
    // User blocked the bot
    if (e.response?.error_code === 403) {
      console.log(`[Bot] User ${telegramId} blocked the bot, skipping`);
      return 'blocked';
    }
    
    // Rate limited — wait and retry once
    if (e.response?.error_code === 429) {
      const retryAfter = e.response.parameters?.retry_after || 1;
      console.warn(`[Bot] Rate limited, waiting ${retryAfter}s for ${telegramId}`);
      await new Promise(res => setTimeout(res, retryAfter * 1000));
      
      try {
        await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
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

/**
 * Send messages to many users in batches.
 * Telegram allows ~30 msgs/sec for bots. We send in batches of 25 with a 1s pause.
 * This handles thousands of users without hitting rate limits.
 * 
 * Like dteubot's approach but adapted for Node.js async.
 */
async function sendBulkMessages(
  messages: { telegramId: string; message: string }[]
): Promise<{ sent: number; blocked: number; errors: number }> {
  const BATCH_SIZE = 25;
  const BATCH_DELAY_MS = 1100; // slightly over 1s to stay safe
  
  let sent = 0;
  let blocked = 0;
  let errors = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    
    // Send batch concurrently (all 25 at once)
    const results = await Promise.all(
      batch.map(msg => sendTelegramMessage(msg.telegramId, msg.message))
    );

    for (const result of results) {
      if (result === 'sent') sent++;
      else if (result === 'blocked') blocked++;
      else errors++;
    }

    // Wait between batches (not after the last one)
    if (i + BATCH_SIZE < messages.length) {
      await new Promise(res => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  return { sent, blocked, errors };
}

// ==================== BROADCAST QUEUE (only for admin mass-sends) ====================

const broadcastQueue: { telegramId: string, message: string }[] = [];
let isBroadcasting = false;

const processBroadcast = async () => {
  if (isBroadcasting) return;
  isBroadcasting = true;
  
  while (broadcastQueue.length > 0) {
    const job = broadcastQueue.shift();
    if (job) {
      await sendTelegramMessage(job.telegramId, job.message);
      await new Promise(res => setTimeout(res, 40)); // 25/sec for broadcasts
    }
  }
  
  isBroadcasting = false;
};

const queueBroadcast = (telegramId: string, message: string) => {
  broadcastQueue.push({ telegramId, message });
  processBroadcast();
};

// ==================== SUBGROUP FILTER (shared logic) ====================

const SUB1_PATTERNS = ['підгр. 1', '1 підгр', 'п/г 1', '1 п/г', 'підгрупа 1', '1 підгрупа', 'пр 1.1'];
const SUB2_PATTERNS = ['підгр. 2', '2 підгр', 'п/г 2', '2 п/г', 'підгрупа 2', '2 підгрупа', 'пр 1.2'];

function shouldNotifyForSubgroup(subject: string, userSubgroup: number): boolean {
  if (userSubgroup === 0) return true;
  const lower = subject.toLowerCase();
  const isSub1Only = SUB1_PATTERNS.some(p => lower.includes(p)) && !SUB2_PATTERNS.some(p => lower.includes(p));
  const isSub2Only = SUB2_PATTERNS.some(p => lower.includes(p)) && !SUB1_PATTERNS.some(p => lower.includes(p));
  if (userSubgroup === 1 && isSub2Only) return false;
  if (userSubgroup === 2 && isSub1Only) return false;
  return true;
}

function filterLessonsBySubgroup(lessons: any[], subgroup: number): any[] {
  if (subgroup === 0) return lessons;
  return lessons.filter(l => shouldNotifyForSubgroup(l.subject, subgroup));
}

// ==================== BOT COMMANDS ====================

bot.start((ctx: Context & { startPayload?: string }) => {
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
    if (isGroup) {
      const botUsername = ctx.botInfo?.username || 'dteu_schedule_bot';
      const configLink = `https://t.me/${botUsername}?start=chat_${ctx.chat?.id}`;
      return ctx.reply(`⚙️ **Налаштування розкладу**\n\nЩоб налаштувати розсилку розкладу для цього чату, будь ласка, перейдіть в особисті повідомлення з ботом.`, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '⚙️ Налаштувати групу', url: configLink }
          ]]
        }
      });
    }

  let url = WEB_APP_URL;
  let msg = `Привіт! 👋\n\nЯ **STUD IN** — твій студентський простір ДТЕУ. Тут твій розклад, сервіси, події та нагадування.`;

  if (ctx.startPayload && ctx.startPayload.startsWith('chat_')) {
    const chatId = ctx.startPayload.replace('chat_', '');
    url = url.includes('?') ? `${url}&chatId=${chatId}` : `${url}?chatId=${chatId}`;
    msg = `⚙️ **Налаштування розкладу для групи**\n\nНатисніть кнопку нижче, щоб вибрати факультет та навчальну групу. Розсилка буде приходити автоматично в обраний вами чат.`;
  }

  ctx.reply(msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "📱 Відкрити STUD IN", web_app: { url } }]
      ]
    }
  });
});

bot.help((ctx: Context) => ctx.reply('Щоб переглянути розклад, змінити підгрупу або налаштувати сповіщення, просто натисніть кнопку *«Відкрити Розклад»* під цим повідомленням.', { parse_mode: 'Markdown' }));

bot.command('admin', (ctx: Context) => {
  const adminId = process.env.ADMIN_TG_ID || '';
  if (!adminId || ctx.from?.id.toString() !== adminId) return; // Silent ignore for others
  
  const secret = process.env.ADMIN_SECRET || 'secret123';
  ctx.reply('🔐 Секретна адмін-панель', {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Відкрити Адмінку", web_app: { url: `${WEB_APP_URL}?admin=${encodeURIComponent(secret)}` } }]
      ]
    }
  });
});

bot.command('admin_broadcast_spam_fix', async (ctx: Context) => {
  const adminId = process.env.ADMIN_TG_ID || '';
  if (!adminId || ctx.from?.id.toString() !== adminId) return; // Silent ignore for others
  
  ctx.reply('⏳ Розпочинаю розсилку вибачень...');
  
  try {
    const users = await prisma.user.findMany({ 
      where: { telegramId: { not: null } } 
    });
    
    const msg = `📢 **Увага!**\n\nБаг із хибними сповіщеннями про розклад повністю виправлено. Тепер повідомлення приходитимуть лише при реальних змінах у МІА.\n\nВибачте за тимчасовий спам! ❤️`;
    
    let count = 0;
    for (const user of users) {
      if (user.telegramId) {
        queueBroadcast(user.telegramId.toString(), msg);
        count++;
      }
    }
    ctx.reply(`✅ Розсилку успішно додано в чергу для ${count} користувачів.`);
  } catch (err) {
    console.error(err);
    ctx.reply('❌ Помилка під час розсилки.');
  }
});

// ==================== LESSON REMINDERS (exact bell schedule, like dteubot) ====================

/**
 * Send lesson reminders for a specific bell time.
 * Called at exact times: 15min and 1min before each lesson start.
 * 
 * Unlike the old approach (cron every minute → DB query), this only runs
 * exactly when needed (6 lessons × 2 reminders = 12 times/day max).
 */
const notifyLessonsAtBell = async (bellStartTime: string, minutesAhead: number) => {
  const today = getKyivTodayUTC();
  
  console.log(`[Notify] Sending ${minutesAhead}m reminders for lessons starting at ${bellStartTime}`);
  
  try {
    // Find all lessons at this exact start time today
    const lessons = await prisma.scheduleItem.findMany({
      where: { date: today, startTime: bellStartTime },
      include: {
        group: {
          include: {
            students: {
              include: { user: true }
            }
          }
        }
      }
    });
    
    if (lessons.length === 0) {
      console.log(`[Notify] No lessons at ${bellStartTime} today`);
      return;
    }

    // Collect all messages to send
    const messagesToSend: { telegramId: string; message: string }[] = [];
    
    for (const lesson of lessons) {
      if (!lesson.group?.students) continue;
      
      for (const student of lesson.group.students) {
        const user = student.user;
        if (!user?.telegramId) continue;
        
        let shouldNotify = minutesAhead === 15 ? user.notify15Min : minutesAhead === 1 ? user.notify1Min : false;
        
        if (shouldNotify && user.preferences) {
          const prefs = user.preferences as any;
          const subgroup = prefs.subgroup || 0;
          shouldNotify = shouldNotifyForSubgroup(lesson.subject, subgroup);
        }
        
        if (shouldNotify) {
          const minText = minutesAhead === 1 ? '1 хвилину' : '15 хвилин';
          const message = `🔔 **Нагадування!**\n\nЧерез ${minText} почнеться пара:\n📖 ${lesson.subject}\n🚪 Ауд: ${lesson.classroom || 'Не вказано'}\n👨‍🏫 ${lesson.teacher || 'Не вказано'}`;
          
          messagesToSend.push({
            telegramId: user.telegramId.toString(),
            message
          });
        }
      }
    }
    
    if (messagesToSend.length === 0) {
      console.log(`[Notify] No users to notify for ${bellStartTime}`);
      return;
    }

    // Send all notifications in batches (handles thousands of students)
    console.log(`[Notify] Sending ${messagesToSend.length} notifications for ${bellStartTime} (${minutesAhead}m ahead)`);
    const result = await sendBulkMessages(messagesToSend);
    console.log(`[Notify] Done: ${result.sent} sent, ${result.blocked} blocked, ${result.errors} errors`);
    
  } catch (err) {
    console.error(`[Notify] Error sending ${minutesAhead}m reminders for ${bellStartTime}:`, err);
  }
};

/**
 * Schedule cron jobs for exact bell times.
 * Like dteubot's gocron approach: calculate exact notification times from bell schedule.
 * 
 * For bell time 08:20:
 *   15m reminder → 08:05 → cron "5 8 * * *"
 *   1m reminder  → 08:19 → cron "19 8 * * *"
 */
function scheduleBellReminders() {
  console.log('[Notify] Setting up bell schedule reminders (like dteubot):');
  
  for (const bell of BELL_SCHEDULE) {
    const [startH, startM] = bell.start.split(':').map(Number);
    
    // 15-minute reminder
    const remind15 = new Date(2000, 0, 1, startH, startM);
    remind15.setMinutes(remind15.getMinutes() - 15);
    const cron15 = `${remind15.getMinutes()} ${remind15.getHours()} * * *`;
    
    cron.schedule(cron15, () => {
      notifyLessonsAtBell(bell.start, 15);
    }, { timezone: 'Europe/Kyiv' });
    
    console.log(`  📋 Lesson ${bell.lesson} (${bell.start}): 15m reminder at ${remind15.getHours().toString().padStart(2,'0')}:${remind15.getMinutes().toString().padStart(2,'0')}`);
    
    // 1-minute reminder
    const remind1 = new Date(2000, 0, 1, startH, startM);
    remind1.setMinutes(remind1.getMinutes() - 1);
    const cron1 = `${remind1.getMinutes()} ${remind1.getHours()} * * *`;
    
    cron.schedule(cron1, () => {
      notifyLessonsAtBell(bell.start, 1);
    }, { timezone: 'Europe/Kyiv' });
    
    console.log(`  📋 Lesson ${bell.lesson} (${bell.start}): 1m reminder at ${remind1.getHours().toString().padStart(2,'0')}:${remind1.getMinutes().toString().padStart(2,'0')}`);
  }
  
  console.log(`[Notify] Scheduled ${BELL_SCHEDULE.length * 2} reminder cron jobs (${BELL_SCHEDULE.length} lessons × 2 reminders)`);
}

// Initialize bell reminders
scheduleBellReminders();

// ==================== MORNING SUMMARY ====================

cron.schedule('30 7 * * *', async () => {
  const today = getKyivTodayUTC();
  
  console.log('[Morning] Sending morning summaries...');
  
  try {
    const users = await prisma.user.findMany({
      where: { notifyMorning: true, telegramId: { not: null } },
      include: { student: true }
    });

    const messagesToSend: { telegramId: string; message: string }[] = [];

    for (const user of users) {
      if (!user.student?.groupId || !user.telegramId) continue;
      
      let lessons = await prisma.scheduleItem.findMany({
        where: { groupId: user.student.groupId, date: today },
        orderBy: { lessonNumber: 'asc' }
      });
      
      // Filter by subgroup
      if (user.preferences) {
        const prefs = user.preferences as any;
        const subgroup = prefs.subgroup || 0;
        lessons = filterLessonsBySubgroup(lessons, subgroup);
      }
      
      if (lessons.length > 0) {
        let message = `🌅 **Доброго ранку! Ваш розклад на сьогодні:**\n\n`;
        lessons.forEach(l => {
          message += `**${l.lessonNumber} пара** (${l.startTime}-${l.endTime})\n📖 ${l.subject}\n🚪 ${l.classroom || 'Не вказано'} | 👨‍🏫 ${l.teacher || 'Не вказано'}\n\n`;
        });
        
        messagesToSend.push({
          telegramId: user.telegramId.toString(),
          message
        });
      }
    }

    if (messagesToSend.length > 0) {
      console.log(`[Morning] Sending ${messagesToSend.length} morning summaries...`);
      const result = await sendBulkMessages(messagesToSend);
      console.log(`[Morning] Done: ${result.sent} sent, ${result.blocked} blocked, ${result.errors} errors`);
    } else {
      console.log('[Morning] No users have lessons today');
    }
  } catch (err) {
    console.error("Morning cron error:", err);
  }
}, { timezone: 'Europe/Kyiv' });

// ==================== SCHEDULE CHANGE NOTIFICATIONS ====================

cron.schedule('*/10 * * * *', async () => {
  try {
    const changes = await prisma.scheduleChange.findMany({
      where: { notified: false },
      include: { 
        group: { 
          include: { 
            students: { 
              include: { user: true } 
            } 
          } 
        } 
      },
      orderBy: [{ groupId: 'asc' }, { date: 'asc' }]
    });

    if (changes.length === 0) return;

    // Group changes by groupId
    const byGroup = new Map<string, typeof changes>();
    for (const c of changes) {
      const arr = byGroup.get(c.groupId) || [];
      arr.push(c);
      byGroup.set(c.groupId, arr);
    }

    const notifiedIds: string[] = [];
    const messagesToSend: { telegramId: string; message: string }[] = [];

    for (const [groupId, groupChanges] of byGroup) {
      const group = groupChanges[0]?.group;
      if (!group) continue;

      let message = `📢 **Зміни в розкладі (${group.name}):**\n\n`;
      
      for (const c of groupChanges) {
        const dateStr = new Date(c.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' });
        const icon = c.changeType === 'added' ? '✅' : c.changeType === 'removed' ? '❌' : '✏️';
        const typeLabel = c.changeType === 'added' ? 'Додано' : c.changeType === 'removed' ? 'Видалено' : 'Змінено';
        
        message += `${icon} **${typeLabel}** (${dateStr}):\n`;
        if (c.subject) message += `📖 ${c.subject}`;
        if (c.lessonNumber) message += ` — ${c.lessonNumber} пара`;
        message += '\n\n';
        
        notifiedIds.push(c.id);
      }

      // Send to all students in group who have notifyChanges enabled
      for (const student of group.students) {
        const user = student.user;
        if (user?.telegramId && (user as any).notifyChanges !== false) {
          messagesToSend.push({
            telegramId: user.telegramId.toString(),
            message
          });
        }
      }
    }

    // Send all change notifications in batches
    if (messagesToSend.length > 0) {
      console.log(`[Changes] Sending ${messagesToSend.length} change notifications...`);
      const result = await sendBulkMessages(messagesToSend);
      console.log(`[Changes] Done: ${result.sent} sent, ${result.blocked} blocked, ${result.errors} errors`);
    }

    // Mark as notified
    if (notifiedIds.length > 0) {
      await prisma.scheduleChange.updateMany({
        where: { id: { in: notifiedIds } },
        data: { notified: true }
      });
      console.log(`[Bot] Notified ${notifiedIds.length} schedule changes`);
    }
  } catch (err) {
    console.error('Schedule change notification error:', err);
  }
}, { timezone: 'Europe/Kyiv' });

// ==================== LAUNCH & SHUTDOWN ====================

bot.command('admin_turn_off_spam', async (ctx: Context) => {
  const adminId = process.env.ADMIN_TG_ID || '';
  if (!adminId || ctx.from?.id.toString() !== adminId) return;
  
  ctx.reply('🔄 Вимикаю сповіщення про зміни для всіх користувачів...');
  try {
    const res = await prisma.user.updateMany({
      data: { notifyChanges: false }
    });
    ctx.reply(`✅ Готово! Вимкнено для ${res.count} користувачів.`);
  } catch (e) {
    console.error(e);
    ctx.reply('❌ Помилка бази даних.');
  }
});

bot.launch().then(() => {
  console.log('🤖 Telegram bot is running...');
}).catch(console.error);

const gracefulShutdown = async (signal: string) => {
  console.log(`[Bot] ${signal} received, shutting down...`);
  bot.stop(signal);
  await prisma.$disconnect();
  process.exit(0);
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
