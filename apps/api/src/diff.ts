import { prisma } from './prisma';

export interface ScheduleDiff {
  groupId: string;
  groupName: string;
  date: Date;
  changes: {
    type: 'added' | 'removed' | 'modified';
    lessonNumber: number;
    subject: string;
    oldValue?: string;
    newValue?: string;
    description: string;
  }[];
}

/**
 * Compare old schedule items with new ones for a given group+date
 * and return diffs
 */
export function detectChanges(
  oldItems: { lessonNumber: number; subject: string; teacher: string | null; classroom: string | null; startTime: string; endTime: string; type: string; annotation: string | null }[],
  newItems: { lessonNumber: number; subject: string; teacher: string | null; classroom: string | null; startTime: string; endTime: string; type: string; annotation: string | null }[]
): ScheduleDiff['changes'] {
  const changes: ScheduleDiff['changes'] = [];

  const oldByLesson = new Map(oldItems.map(i => [i.lessonNumber + ':' + i.subject, i]));
  const newByLesson = new Map(newItems.map(i => [i.lessonNumber + ':' + i.subject, i]));

  // Find removed lessons
  for (const [key, oldItem] of oldByLesson) {
    if (!newByLesson.has(key)) {
      changes.push({
        type: 'removed',
        lessonNumber: oldItem.lessonNumber,
        subject: oldItem.subject,
        oldValue: JSON.stringify(oldItem),
        description: `❌ Видалено: ${oldItem.lessonNumber} пара — ${oldItem.subject}`
      });
    }
  }

  // Find added lessons
  for (const [key, newItem] of newByLesson) {
    if (!oldByLesson.has(key)) {
      changes.push({
        type: 'added',
        lessonNumber: newItem.lessonNumber,
        subject: newItem.subject,
        newValue: JSON.stringify(newItem),
        description: `✅ Додано: ${newItem.lessonNumber} пара — ${newItem.subject} (${newItem.startTime}-${newItem.endTime})`
      });
    }
  }

  // Find modified lessons
  for (const [key, oldItem] of oldByLesson) {
    const newItem = newByLesson.get(key);
    if (!newItem) continue;

    const diffs: string[] = [];
    if (oldItem.teacher !== newItem.teacher) {
      diffs.push(`викладач: ${oldItem.teacher || '?'} → ${newItem.teacher || '?'}`);
    }
    if (oldItem.classroom !== newItem.classroom) {
      diffs.push(`аудиторія: ${oldItem.classroom || '?'} → ${newItem.classroom || '?'}`);
    }
    if (oldItem.startTime !== newItem.startTime || oldItem.endTime !== newItem.endTime) {
      diffs.push(`час: ${oldItem.startTime}-${oldItem.endTime} → ${newItem.startTime}-${newItem.endTime}`);
    }
    if (oldItem.type !== newItem.type) {
      diffs.push(`тип: ${oldItem.type} → ${newItem.type}`);
    }
    if (oldItem.annotation !== newItem.annotation) {
      diffs.push(`анотація: ${oldItem.annotation || '?'} → ${newItem.annotation || '?'}`);
    }

    if (diffs.length > 0) {
      changes.push({
        type: 'modified',
        lessonNumber: oldItem.lessonNumber,
        subject: oldItem.subject,
        oldValue: JSON.stringify(oldItem),
        newValue: JSON.stringify(newItem),
        description: `✏️ Змінено: ${oldItem.lessonNumber} пара — ${oldItem.subject} (${diffs.join(', ')})`
      });
    }
  }

  return changes;
}

/**
 * Save detected changes to the database
 */
export async function saveChanges(groupId: string, date: Date, changes: ScheduleDiff['changes']) {
  if (changes.length === 0) return;

  await prisma.scheduleChange.createMany({
    data: changes.map(c => ({
      groupId,
      date,
      changeType: c.type,
      lessonNumber: c.lessonNumber,
      subject: c.subject,
      oldValue: c.oldValue || null,
      newValue: c.newValue || null,
    }))
  });
}

/**
 * Get unnotified changes and format for Telegram
 */
export async function getUnnotifiedChanges() {
  const changes = await prisma.scheduleChange.findMany({
    where: { notified: false },
    include: { group: { include: { students: { include: { user: true } } } } },
    orderBy: [{ groupId: 'asc' }, { date: 'asc' }]
  });

  return changes;
}

/**
 * Mark changes as notified
 */
export async function markAsNotified(ids: string[]) {
  await prisma.scheduleChange.updateMany({
    where: { id: { in: ids } },
    data: { notified: true }
  });
}
