import type { ScheduleItem } from '../types';

const SUB1_PATTERNS = ['підгр. 1', '1 підгр', 'п/г 1', '1 п/г', 'підгрупа 1', '1 підгрупа', 'пр 1.1'];
const SUB2_PATTERNS = ['підгр. 2', '2 підгр', 'п/г 2', '2 п/г', 'підгрупа 2', '2 підгрупа', 'пр 1.2'];

export function filterBySubgroup(items: ScheduleItem[], subgroup: number): ScheduleItem[] {
  if (subgroup === 0) return items;
  if (subgroup === 1) {
    return items.filter(s => {
      const sub = s.subject.toLowerCase();
      const isSub2Only = SUB2_PATTERNS.some(p => sub.includes(p)) && !SUB1_PATTERNS.some(p => sub.includes(p));
      return !isSub2Only;
    });
  }
  if (subgroup === 2) {
    return items.filter(s => {
      const sub = s.subject.toLowerCase();
      const isSub1Only = SUB1_PATTERNS.some(p => sub.includes(p)) && !SUB2_PATTERNS.some(p => sub.includes(p));
      return !isSub1Only;
    });
  }
  return items;
}
