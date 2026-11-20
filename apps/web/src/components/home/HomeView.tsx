import React, { useMemo } from 'react';
import type { Group, Page, ScheduleItem, StudEvent } from '../../types';
import { BELL_SCHEDULE, typeLabel } from '../../utils/constants';
import { filterBySubgroup } from '../../utils/subgroupFilter';

interface Props {
  userName: string;
  selectedGroup: Group | null;
  schedule: ScheduleItem[];
  effectiveSubgroup: number;
  now: Date;
  events: StudEvent[];
  onNavigate: (page: Page) => void;
  onSelectLesson: (lesson: ScheduleItem) => void;
  onSelectEvent: (ev: StudEvent) => void;
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const HomeView: React.FC<Props> = ({
  userName,
  selectedGroup,
  schedule,
  effectiveSubgroup,
  now,
  events,
  onNavigate,
  onSelectLesson,
  onSelectEvent,
}) => {
  const filtered = useMemo(
    () => filterBySubgroup(schedule, effectiveSubgroup),
    [schedule, effectiveSubgroup]
  );

  const todayMidnight = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now]
  );

  const todayLessons = useMemo(() => {
    return filtered
      .filter((item) => {
        const d = new Date(item.date);
        return (
          new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() ===
          todayMidnight.getTime()
        );
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filtered, todayMidnight]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Live timer state for today's lessons (active lesson or active break between lessons)
  const liveTimerInfo = useMemo(() => {
    if (todayLessons.length === 0) return null;

    // 1. Check if a lesson is currently in progress
    const activeLesson = todayLessons.find(
      (l) => nowTimeStr >= l.startTime && nowTimeStr <= l.endTime
    );
    if (activeLesson) {
      const startMin = toMinutes(activeLesson.startTime);
      const endMin = toMinutes(activeLesson.endTime);
      const total = Math.max(1, endMin - startMin);
      const elapsed = Math.max(0, nowMinutes - startMin);
      const left = Math.max(0, endMin - nowMinutes);
      const percent = Math.min(100, Math.round((elapsed / total) * 100));
      const bell = BELL_SCHEDULE.find((b) => b.n === activeLesson.lessonNumber);
      const breakInfo = bell && bell.breakAfter > 0 ? ` · далі перерва ${bell.breakAfter} хв` : '';

      return {
        mode: 'active' as const,
        lesson: activeLesson,
        eyebrow: `ЗАРАЗ ТРИВАЄ ${activeLesson.lessonNumber} ПАРА`,
        timerLabel: `До кінця пари: ${left} хв${breakInfo}`,
        percent,
      };
    }

    // 2. Check if we are on a break or waiting for the next lesson today
    const nextToday = todayLessons.find((l) => l.startTime > nowTimeStr);
    if (nextToday) {
      const prevToday = [...todayLessons]
        .reverse()
        .find((l) => l.endTime < nowTimeStr);
      const nextStartMin = toMinutes(nextToday.startTime);
      const leftToStart = Math.max(0, nextStartMin - nowMinutes);

      if (prevToday) {
        const prevEndMin = toMinutes(prevToday.endTime);
        const totalBreak = Math.max(1, nextStartMin - prevEndMin);
        const elapsedBreak = Math.max(0, nowMinutes - prevEndMin);
        const percent = Math.min(100, Math.round((elapsedBreak / totalBreak) * 100));
        return {
          mode: 'break' as const,
          lesson: nextToday,
          eyebrow: `ЗАРАЗ ПЕРЕРВА · ДАЛІ ${nextToday.lessonNumber} ПАРА`,
          timerLabel: `До початку пари залишилось ${leftToStart} хв`,
          percent,
        };
      }

      if (leftToStart <= 120) {
        const percent = Math.min(100, Math.round(((120 - leftToStart) / 120) * 100));
        return {
          mode: 'soon' as const,
          lesson: nextToday,
          eyebrow: `СЬОГОДНІ · ${nextToday.lessonNumber} ПАРА`,
          timerLabel:
            leftToStart >= 60
              ? `Початок через ${Math.floor(leftToStart / 60)} год ${leftToStart % 60} хв`
              : `Початок через ${leftToStart} хв`,
          percent,
        };
      }
    }

    return null;
  }, [todayLessons, nowTimeStr, nowMinutes]);

  const upcomingLesson = useMemo(() => {
    if (liveTimerInfo) {
      return { lesson: liveTimerInfo.lesson, isToday: true };
    }

    const todayNext = todayLessons.find((l) => l.endTime >= nowTimeStr);
    if (todayNext) return { lesson: todayNext, isToday: true };

    const future = filtered
      .filter((item) => {
        const d = new Date(item.date);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return day.getTime() > todayMidnight.getTime();
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return da !== db ? da - db : a.startTime.localeCompare(b.startTime);
      });

    if (future.length > 0) return { lesson: future[0], isToday: false };
    if (todayLessons.length > 0) return { lesson: todayLessons[0], isToday: true };

    return {
      isToday: false,
      lesson: {
        id: 'demo-fallback',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
        startTime: '08:20',
        endTime: '09:40',
        lessonNumber: 1,
        subject: 'Прямий маркетинг',
        teacher: 'Сідєльніков Д. С.',
        classroom: 'Онлайн',
        type: 'lecture',
      } as ScheduleItem,
    };
  }, [liveTimerInfo, filtered, todayLessons, todayMidnight, now, nowTimeStr]);

  const eyebrowLabel = useMemo(() => {
    if (liveTimerInfo) return liveTimerInfo.eyebrow;
    const d = new Date(upcomingLesson.lesson.date);
    const wd = d.toLocaleDateString('uk-UA', { weekday: 'short' }).toUpperCase();
    const dayMonth = d
      .toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
      .toUpperCase()
      .replace('.', '');
    return `НАСТУПНА ПАРА · ${wd}, ${dayMonth}`;
  }, [liveTimerInfo, upcomingLesson]);

  const firstName = useMemo(() => {
    if (!userName.trim()) return 'студенте';
    const parts = userName.trim().split(/\s+/);
    return parts.length > 1 ? parts[1] : parts[0];
  }, [userName]);

  const isOnline =
    !upcomingLesson.lesson.classroom ||
    upcomingLesson.lesson.classroom.toLowerCase().includes('онлайн') ||
    upcomingLesson.lesson.classroom.toLowerCase().includes('дист');

  const featuredEvent = events[0];

  return (
    <div className="stud-anim-in">
      {/* Greeting Header */}
      <div className="stud-page-header">
        <h1 className="stud-h1">Привіт, {userName.trim() ? firstName : 'студенте'}</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}</span>
          <span className="stud-pill-status">
            {todayLessons.length === 0 ? 'Сьогодні без пар' : `Сьогодні ${todayLessons.length} пар(и)`}
          </span>
        </div>
      </div>

      {/* Next / Current Lesson Dark Green Featured Card with Live Timer */}
      <div
        className="stud-hero-card"
        onClick={() => onSelectLesson(upcomingLesson.lesson)}
        style={{ cursor: 'pointer' }}
      >
        <div className="stud-hero-eyebrow">{eyebrowLabel}</div>
        <div className="stud-hero-time">
          <span className="stud-hero-time-start">{upcomingLesson.lesson.startTime}</span>
          <span className="stud-hero-time-end">— {upcomingLesson.lesson.endTime}</span>
        </div>
        <div className="stud-hero-title">{upcomingLesson.lesson.subject}</div>
        <div className="stud-hero-meta">
          {typeLabel(upcomingLesson.lesson.type)}
          {upcomingLesson.lesson.teacher ? ` · ${upcomingLesson.lesson.teacher}` : ''}
        </div>

        {/* Live Countdown & Progress Bar when a lesson or break is active today */}
        {liveTimerInfo && (
          <div style={{ marginBottom: '0.85rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--accent-lime)',
                marginBottom: '0.35rem',
              }}
            >
              <span>⏱ {liveTimerInfo.timerLabel}</span>
              <span>{liveTimerInfo.percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.16)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${liveTimerInfo.percent}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: 'var(--accent-lime)',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        )}

        <div>
          <span className="stud-online-chip">
            {isOnline ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Онлайн
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Ауд. {upcomingLesson.lesson.classroom}
              </>
            )}
          </span>
        </div>

        <div className="stud-hero-divider" />

        <button
          type="button"
          className="stud-hero-footer"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('schedule');
          }}
        >
          <span>Відкрити розклад</span>
          <span>→</span>
        </button>
      </div>

      {/* Quick Access 2x2 Grid */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Швидкий доступ</h2>
      </div>

      <div className="stud-quick-grid">
        <button type="button" className="stud-quick-card" onClick={() => onNavigate('schedule')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span className="stud-quick-label">Розклад</span>
        </button>

        <button type="button" className="stud-quick-card" onClick={() => onNavigate('campus')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span className="stud-quick-label">Кампус</span>
        </button>

        <button type="button" className="stud-quick-card" onClick={() => onNavigate('bells')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <span className="stud-quick-label">Дзвінки</span>
        </button>

        <button type="button" className="stud-quick-card" onClick={() => onNavigate('directory')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </span>
          <span className="stud-quick-label">Довідник</span>
        </button>
      </div>

      {/* Student Life Section */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Студентське життя</h2>
        <button type="button" className="stud-inline-action" onClick={() => onNavigate('events')}>
          Усі події →
        </button>
      </div>

      {featuredEvent && (
        <button
          type="button"
          className="stud-list-card"
          onClick={() => onSelectEvent(featuredEvent)}
        >
          <div className="stud-date-badge stud-date-badge--lime">
            <span className="stud-date-badge-day">{featuredEvent.dayNum}</span>
            <span className="stud-date-badge-month">{featuredEvent.monthShort}</span>
          </div>
          <div className="stud-list-body">
            <div className="stud-list-title">{featuredEvent.title}</div>
            <div className="stud-list-sub">
              {featuredEvent.isLive ? 'Офіційний анонс · sute.edu.ua' : 'Приклад події · Студжиття'}
            </div>
          </div>
          <span className="stud-list-arrow">→</span>
        </button>
      )}
    </div>
  );
};
