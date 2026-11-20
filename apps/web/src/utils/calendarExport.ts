import type { ScheduleItem } from '../types';
import { typeLabel } from './constants';
import { API } from './api';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIcsDate(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}${mo}${d}T${pad(h || 8)}${pad(m || 0)}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return '\\' + match;
  });
}

export function buildClientIcsString(
  lessons: ScheduleItem[],
  groupName: string = 'ДТЕУ'
): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//STUD IN DTEU//UA',
    `X-WR-CALNAME:${escapeIcs(`STUD IN · ${groupName}`)}`,
    'X-WR-TIMEZONE:Europe/Kyiv',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n');

  const events = lessons.map((item, idx) => {
    const d = new Date(item.date);
    const dtStart = toIcsDate(d, item.startTime);
    const dtEnd = toIcsDate(d, item.endTime);
    const uid = `${dtStart}-${idx}@studin-dteu`;
    const tLabel = typeLabel(item.type);

    let desc = `${item.lessonNumber} пара · ${tLabel}`;
    if (item.teacher) desc += `\nВикладач: ${item.teacher}`;
    if (item.classroom) desc += `\nЛокація: ${item.classroom}`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcs(`${item.subject} (${tLabel})`)}`,
      `DESCRIPTION:${escapeIcs(desc)}`,
      item.classroom ? `LOCATION:${escapeIcs(item.classroom)}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });

  return `${header}\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
}

export function exportScheduleToCalendar(
  groupId: string | undefined,
  groupName: string,
  lessons: ScheduleItem[],
  openLink?: (url: string) => void
) {
  // If real DB group and inside Telegram WebApp, open direct API .ics URL so iOS/Android prompts native Calendar import
  if (groupId && !groupId.startsWith('demo-') && window.Telegram?.WebApp && openLink) {
    openLink(`${API}/api/schedule/export/ics?groupId=${encodeURIComponent(groupId)}`);
    return;
  }

  // Otherwise generate and download .ics file directly in browser
  const icsContent = buildClientIcsString(lessons, groupName);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `STUDIN_${groupName.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
