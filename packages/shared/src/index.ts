// ==================== TYPES ====================

export interface Faculty {
  id: string;
  name: string;
  shortName?: string;
}

export interface Course {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  course: number;
}

export interface ScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  lessonNumber: number;
  subject: string;
  teacher: string | null;
  classroom: string | null;
  type: string;
  groupId?: string;
  group?: Group;
}

export interface Student {
  id: string;
  fullName: string;
  groupId?: string;
  isMkr?: boolean;
}

export interface ScheduleChange {
  id: string;
  groupId: string;
  date: string;
  changeType: 'added' | 'removed' | 'modified';
  lessonNumber: number | null;
  subject: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

// ==================== SUBGROUP FILTER ====================

const SUB1_PATTERNS = ['підгр. 1', '1 підгр', 'п/г 1', '1 п/г', 'підгрупа 1', '1 підгрупа', 'пр 1.1'];
const SUB2_PATTERNS = ['підгр. 2', '2 підгр', 'п/г 2', '2 п/г', 'підгрупа 2', '2 підгрупа', 'пр 1.2'];

export function isSubgroup1Only(subject: string): boolean {
  const lower = subject.toLowerCase();
  return SUB1_PATTERNS.some(p => lower.includes(p)) && !SUB2_PATTERNS.some(p => lower.includes(p));
}

export function isSubgroup2Only(subject: string): boolean {
  const lower = subject.toLowerCase();
  return SUB2_PATTERNS.some(p => lower.includes(p)) && !SUB1_PATTERNS.some(p => lower.includes(p));
}

export function filterBySubgroup<T extends { subject: string }>(items: T[], subgroup: number): T[] {
  if (subgroup === 0) return items;
  if (subgroup === 1) {
    return items.filter(item => !isSubgroup2Only(item.subject));
  }
  if (subgroup === 2) {
    return items.filter(item => !isSubgroup1Only(item.subject));
  }
  return items;
}

export function shouldNotifyForSubgroup(subject: string, userSubgroup: number): boolean {
  if (userSubgroup === 0) return true;
  if (userSubgroup === 1 && isSubgroup2Only(subject)) return false;
  if (userSubgroup === 2 && isSubgroup1Only(subject)) return false;
  return true;
}

// ==================== DATE UTILS ====================

export function formatDateDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function parseDateDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

export function getDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function getTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// ==================== CONSTANTS ====================

export const BELL_SCHEDULE = [
  { n: 1, start: '08:20', end: '09:40' },
  { n: 2, start: '10:05', end: '11:25' },
  { n: 3, start: '12:05', end: '13:25' },
  { n: 4, start: '13:50', end: '15:10' },
  { n: 5, start: '15:25', end: '16:45' },
  { n: 6, start: '17:00', end: '18:20' },
];

export function typeLabel(t: string): string {
  if (t === 'lecture') return 'Лекція';
  if (t === 'practice') return 'Практика';
  if (t === 'lab') return 'Лабораторна';
  return 'Заняття';
}

export function badgeClass(t: string): string {
  if (t === 'lecture') return 'badge--lk';
  if (t === 'practice') return 'badge--pr';
  return 'badge--lb';
}
