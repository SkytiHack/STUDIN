/**
 * ICS Calendar Export
 * Generates .ics files for schedule items
 */

interface IcsEvent {
  subject: string;
  teacher: string | null;
  classroom: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  type: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIcsDate(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}${mo}${d}T${pad(h)}${pad(m)}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return '\\' + match;
  });
}

export function generateIcsEvent(event: IcsEvent): string {
  const uid = `${toIcsDate(event.date, event.startTime)}-${Math.random().toString(36).slice(2, 8)}@sute-schedule`;
  const dtStart = toIcsDate(event.date, event.startTime);
  const dtEnd = toIcsDate(event.date, event.endTime);
  
  let description = event.subject;
  if (event.teacher) description += `\\nВикладач: ${event.teacher}`;
  if (event.classroom) description += `\\nАудиторія: ${event.classroom}`;

  const typeLabel = event.type === 'lecture' ? 'Лекція' : event.type === 'practice' ? 'Практика' : event.type === 'lab' ? 'Лабораторна' : 'Заняття';
  description += `\\nТип: ${typeLabel}`;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;TZID=Europe/Kyiv:${dtStart}`,
    `DTEND;TZID=Europe/Kyiv:${dtEnd}`,
    `SUMMARY:${escapeIcs(event.subject)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    event.classroom ? `LOCATION:${escapeIcs('Ауд. ' + event.classroom)}` : '',
    'STATUS:CONFIRMED',
    `CATEGORIES:${typeLabel}`,
    'END:VEVENT'
  ].filter(Boolean).join('\r\n');
}

export function generateIcsCalendar(events: IcsEvent[], calendarName: string = 'SUTE Schedule'): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SUTE Schedule//UA',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Kyiv',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Timezone definition
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Kyiv',
    'BEGIN:STANDARD',
    'DTSTART:19701025T040000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0200',
    'TZNAME:EET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0300',
    'TZNAME:EEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE'
  ].join('\r\n');

  const body = events.map(e => generateIcsEvent(e)).join('\r\n');

  return `${header}\r\n${body}\r\nEND:VCALENDAR\r\n`;
}
