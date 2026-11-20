import type { ScheduleItem, StudEvent, Faculty, Group, Student } from '../types';

export const BELL_SCHEDULE = [
  { n: 1, start: '08:20', end: '09:40', breakAfter: 25 },
  { n: 2, start: '10:05', end: '11:25', breakAfter: 40 },
  { n: 3, start: '12:05', end: '13:25', breakAfter: 25 },
  { n: 4, start: '13:50', end: '15:10', breakAfter: 15 },
  { n: 5, start: '15:25', end: '16:45', breakAfter: 15 },
  { n: 6, start: '17:00', end: '18:20', breakAfter: 0 },
];

export const DEFAULT_FACULTIES: Faculty[] = [
  { id: '6', name: 'Факультет торгівлі та маркетингу', shortName: 'ФТМ' },
  { id: '7', name: 'Факультет інформаційних технологій', shortName: 'ФІТ' },
  { id: '3', name: 'Факультет технологій та бізнесу', shortName: 'ФТБ' },
  { id: '1', name: 'Факультет економіки, менеджменту та психології', shortName: 'ФЕМП' },
  { id: '8', name: 'Факультет міжнародної торгівлі та права', shortName: 'ФМТП' },
  { id: '5', name: 'Факультет фінансів та обліку', shortName: 'ФФО' },
];

export const FACULTY_SHORT_MAP: Record<string, string> = {
  'Факультет торгівлі та маркетингу': 'ФТМ',
  'Факультет інформаційних технологій': 'ФІТ',
  'Факультет технологій та бізнесу': 'ФТБ',
  'Факультет економіки, менеджменту та психології': 'ФЕМП',
  'Факультет міжнародної торгівлі та права': 'ФМТП',
  'Факультет фінансів та обліку': 'ФФО',
};

export function getFacultyShortName(nameOrShort?: string): string {
  if (!nameOrShort) return 'ФТМ';
  if (FACULTY_SHORT_MAP[nameOrShort]) return FACULTY_SHORT_MAP[nameOrShort];
  for (const [full, short] of Object.entries(FACULTY_SHORT_MAP)) {
    if (nameOrShort.toLowerCase().includes(full.toLowerCase()) || nameOrShort.toUpperCase() === short) {
      return short;
    }
  }
  return nameOrShort.length <= 6 ? nameOrShort : 'ДТЕУ';
}

export const DEMO_GROUPS_BY_FACULTY: Record<string, Group[]> = {
  '6': [
    { id: 'demo-ftm-3-10', name: 'ФТМ 3-10', course: 3 },
    { id: 'demo-ftm-1-1', name: 'ФТМ 1-1', course: 1 },
    { id: 'demo-ftm-2-4', name: 'ФТМ 2-4', course: 2 },
    { id: 'demo-ftm-3-9', name: 'ФТМ 3-9', course: 3 },
    { id: 'demo-ftm-4-2', name: 'ФТМ 4-2', course: 4 },
  ],
  '7': [
    { id: 'demo-fit-1-4', name: 'ФІТ 1-4', course: 1 },
    { id: 'demo-fit-2-6', name: 'ФІТ 2-6', course: 2 },
    { id: 'demo-fit-3-2', name: 'ФІТ 3-2', course: 3 },
    { id: 'demo-fit-4-1', name: 'ФІТ 4-1', course: 4 },
  ],
  '3': [
    { id: 'demo-ftb-2-1', name: 'ФТБ 2-1', course: 2 },
    { id: 'demo-ftb-3-5', name: 'ФТБ 3-5', course: 3 },
  ],
  '1': [
    { id: 'demo-femp-1-2', name: 'ФЕМП 1-2', course: 1 },
    { id: 'demo-femp-2-8', name: 'ФЕМП 2-8', course: 2 },
    { id: 'demo-femp-3-4', name: 'ФЕМП 3-4', course: 3 },
  ],
  '8': [
    { id: 'demo-fmtp-2-3', name: 'ФМТП 2-3', course: 2 },
    { id: 'demo-fmtp-3-7', name: 'ФМТП 3-7', course: 3 },
  ],
  '5': [
    { id: 'demo-ffo-1-5', name: 'ФФО 1-5', course: 1 },
    { id: 'demo-ffo-3-1', name: 'ФФО 3-1', course: 3 },
  ],
};

export const DEMO_STUDENTS: Student[] = [
  { id: 'st-0', fullName: 'Тестовий Студент' },
  { id: 'st-1', fullName: 'Студент 01' },
  { id: 'st-2', fullName: 'Студент 02' },
  { id: 'st-3', fullName: 'Студент 03' },
  { id: 'st-4', fullName: 'Студент 04' },
];

export const DEMO_EVENTS: StudEvent[] = [
  {
    id: 'ev-forum',
    title: 'Студентський форум',
    subtitle: 'Зустрічі, ідеї та нові знайомства',
    category: 'studlife',
    categoryBadge: 'НАЙБЛИЖЧА ПОДІЯ',
    dateLabel: '12 листопада',
    dayNum: '12',
    monthShort: 'лис',
    timeInfo: 'Час уточнюється',
    locationTitle: 'Місце уточнюється',
    locationSub: 'Організатор додасть адресу',
    description: 'Зустріч студентів для обміну досвідом, знайомств та спільних ідей.',
    organizerInfo: 'Організатор і джерело: ще не додано',
    registrationOpen: false,
    isFeatured: true,
  },
  {
    id: 'ev-career',
    title: 'День кар’єри',
    subtitle: 'Компанії та стажування',
    category: 'opportunities',
    categoryBadge: 'МОЖЛИВОСТІ',
    dateLabel: '18 листопада',
    dayNum: '18',
    monthShort: 'лис',
    timeInfo: '11:00 — 16:00',
    locationTitle: 'Головний корпус ДТЕУ (А)',
    locationSub: 'вул. Кіото, 19 · Хол 1-го поверху',
    description: 'Знайомство з провідними роботодавцями України, актуальні програми стажування та воркшопи зі створення резюме для студентів ДТЕУ.',
    organizerInfo: 'Організатор: Центр розвитку кар’єри ДТЕУ',
    registrationOpen: false,
  },
  {
    id: 'ev-masterclass',
    title: 'Майстер-клас',
    subtitle: 'Практична зустріч зі спікером',
    category: 'study',
    categoryBadge: 'НАВЧАННЯ',
    dateLabel: '25 листопада',
    dayNum: '25',
    monthShort: 'лис',
    timeInfo: '14:00 — 15:30',
    locationTitle: 'Онлайн / Конференц-зал',
    locationSub: 'Посилання надійде після відкриття реєстрації',
    description: 'Практичний розбір сучасних кейсів маркетингу, диджитал-комунікацій та аналітики від запрошеного спікера.',
    organizerInfo: 'Організатор: Наукове товариство студентів ДТЕУ',
    registrationOpen: false,
  },
];

/**
 * Generates realistic demo schedule items around the current month/week
 * so that if the backend is offline or a demo group is chosen, the user sees
 * the exact schedule experience from the STUD IN mockups.
 */
export function generateDemoSchedule(referenceDate: Date = new Date()): ScheduleItem[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const items: ScheduleItem[] = [];

  // Create lessons for every weekday of the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) continue; // Weekends have no classes ("Сьогодні пар немає")

    const isoDate = new Date(Date.UTC(year, month, day)).toISOString();

    if (dow === 1) {
      // Monday: 4 lessons (matches mockup: 08:20 Прямий маркетинг, 10:05 Прямий маркетинг, etc.)
      items.push(
        {
          id: `demo-${day}-1`,
          date: isoDate,
          startTime: '08:20',
          endTime: '09:40',
          lessonNumber: 1,
          subject: 'Прямий маркетинг',
          teacher: 'Сідєльніков Д. С.',
          classroom: 'Онлайн',
          type: 'lecture',
        },
        {
          id: `demo-${day}-2`,
          date: isoDate,
          startTime: '10:05',
          endTime: '11:25',
          lessonNumber: 2,
          subject: 'Прямий маркетинг',
          teacher: 'Сідєльніков Д. С.',
          classroom: 'Онлайн',
          type: 'lecture',
        },
        {
          id: `demo-${day}-3`,
          date: isoDate,
          startTime: '12:05',
          endTime: '13:25',
          lessonNumber: 3,
          subject: 'Маркетингові дослідження',
          teacher: 'Коваленко О. В.',
          classroom: 'Онлайн',
          type: 'practice',
        },
        {
          id: `demo-${day}-4`,
          date: isoDate,
          startTime: '13:50',
          endTime: '15:10',
          lessonNumber: 4,
          subject: 'Поведінка споживачів',
          teacher: 'Мельник І. П.',
          classroom: 'А-312',
          type: 'practice',
        }
      );
    } else if (dow === 2) {
      // Tuesday: 3 lessons
      items.push(
        {
          id: `demo-${day}-1`,
          date: isoDate,
          startTime: '08:20',
          endTime: '09:40',
          lessonNumber: 1,
          subject: 'Цифровий маркетинг',
          teacher: 'Бондаренко Т. М.',
          classroom: 'Онлайн',
          type: 'lecture',
        },
        {
          id: `demo-${day}-2`,
          date: isoDate,
          startTime: '10:05',
          endTime: '11:25',
          lessonNumber: 2,
          subject: 'Цифровий маркетинг',
          teacher: 'Бондаренко Т. М.',
          classroom: 'Онлайн',
          type: 'practice',
        },
        {
          id: `demo-${day}-3`,
          date: isoDate,
          startTime: '12:05',
          endTime: '13:25',
          lessonNumber: 3,
          subject: 'Іноземна мова професійного спрямування',
          teacher: 'Савченко Н. Ю.',
          classroom: 'Б-204',
          type: 'practice',
        }
      );
    } else if (dow === 3) {
      // Wednesday: 3 lessons
      items.push(
        {
          id: `demo-${day}-1`,
          date: isoDate,
          startTime: '10:05',
          endTime: '11:25',
          lessonNumber: 2,
          subject: 'Прямий маркетинг',
          teacher: 'Сідєльніков Д. С.',
          classroom: 'Онлайн',
          type: 'practice',
        },
        {
          id: `demo-${day}-2`,
          date: isoDate,
          startTime: '12:05',
          endTime: '13:25',
          lessonNumber: 3,
          subject: 'Логістика та управління ланцюгами постачання',
          teacher: 'Гриценко В. А.',
          classroom: 'В-405',
          type: 'lecture',
        },
        {
          id: `demo-${day}-3`,
          date: isoDate,
          startTime: '13:50',
          endTime: '15:10',
          lessonNumber: 4,
          subject: 'Комерційна діяльність',
          teacher: 'Шевчук Л. О.',
          classroom: 'А-215',
          type: 'practice',
        }
      );
    } else if (dow === 5) {
      // Friday: 2 lessons
      items.push(
        {
          id: `demo-${day}-1`,
          date: isoDate,
          startTime: '08:20',
          endTime: '09:40',
          lessonNumber: 1,
          subject: 'Бренд-менеджмент',
          teacher: 'Кравчук С. В.',
          classroom: 'Онлайн',
          type: 'lecture',
        },
        {
          id: `demo-${day}-2`,
          date: isoDate,
          startTime: '10:05',
          endTime: '11:25',
          lessonNumber: 2,
          subject: 'Бренд-менеджмент',
          teacher: 'Кравчук С. В.',
          classroom: 'Онлайн',
          type: 'practice',
        }
      );
    }
  }

  return items;
}

export const badgeClass = (t: string) => t === 'lecture' ? 'badge--lk' : t === 'practice' ? 'badge--pr' : 'badge--lb';
export const typeLabel = (t: string) => t === 'lecture' ? 'Лекція' : t === 'practice' ? 'Практика' : t === 'lab' ? 'Лабораторна' : 'Заняття';

export const getNowTimeString = (now: Date) => `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
