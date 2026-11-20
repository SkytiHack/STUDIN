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
  annotation?: string | null;
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

export interface StudEvent {
  id: string;
  title: string;
  subtitle: string;
  category: 'study' | 'studlife' | 'opportunities';
  categoryBadge: string;
  dateLabel: string;
  dayNum: string;
  monthShort: string;
  timeInfo: string;
  locationTitle: string;
  locationSub: string;
  description: string;
  organizerInfo: string;
  registrationOpen: boolean;
  isFeatured?: boolean;
}

export type Tab = 'today' | 'tomorrow' | 'week' | 'month';
export type NavTab = 'home' | 'schedule' | 'services' | 'events' | 'profile';

export type Page =
  | 'setup'
  | 'setup-group-search'
  | 'setup-ready'
  | 'home'
  | 'schedule'
  | 'lesson-detail'
  | 'services'
  | 'campus'
  | 'directory'
  | 'community'
  | 'bells'
  | 'events'
  | 'event-detail'
  | 'profile'
  | 'notifications'
  | 'support'
  | 'students'
  | 'admin'
  | 'group-setup'
  | 'group-setup-success'
  | 'teacher-schedule'
  | 'search'
  | 'grades';

export interface Grade {
  subject: string;
  currentScore: number;
  maxScore: number;
  category: 'journal' | 'session' | 'overall';
}
