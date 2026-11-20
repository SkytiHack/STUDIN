import React, { useMemo, useState } from 'react';
import type { Group, ScheduleItem, Tab } from '../../types';
import { filterBySubgroup } from '../../utils/subgroupFilter';
import { typeLabel, getNowTimeString } from '../../utils/constants';

interface Props {
  schedule: ScheduleItem[];
  loading: boolean;
  error?: boolean;
  isDemoData?: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  now: Date;
  effectiveSubgroup: number;
  selectedGroup: Group | null;
  onRetry?: () => void;
  onOpenStudents: () => void;
  onSelectLesson: (lesson: ScheduleItem) => void;
}

const WEEKDAY_SHORT_UA = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatFullDayLabel(d: Date): string {
  return d
    .toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .toUpperCase();
}

export const ScheduleView: React.FC<Props> = ({
  schedule,
  loading,
  error = false,
  isDemoData = false,
  tab,
  setTab,
  now,
  effectiveSubgroup,
  selectedGroup,
  onRetry,
  onOpenStudents,
  onSelectLesson,
}) => {
  const todayDate = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now]
  );

  const tomorrowDate = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + 1);
    return d;
  }, [todayDate]);

  const filtered = useMemo(
    () => filterBySubgroup(schedule, effectiveSubgroup),
    [schedule, effectiveSubgroup]
  );

  // Selected day for the Week tab
  const [selectedWeekDay, setSelectedWeekDay] = useState<Date>(() => {
    const mon = getMondayOfWeek(todayDate);
    // If today is weekend, default to Monday so user sees lessons on Week view
    return todayDate.getDay() === 0 || todayDate.getDay() === 6 ? mon : todayDate;
  });

  // Selected month & day for the Month tab
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date>(() => {
    const mon = getMondayOfWeek(todayDate);
    return todayDate.getDay() === 0 || todayDate.getDay() === 6 ? mon : todayDate;
  });

  const [showAllLessons, setShowAllLessons] = useState(false);

  // Days of the active week (Mon..Sun)
  const weekDays = useMemo(() => {
    const base = getMondayOfWeek(selectedWeekDay);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [selectedWeekDay]);

  const getLessonsForDate = (targetDate: Date): ScheduleItem[] => {
    return filtered
      .filter((item) => {
        const d = new Date(item.date);
        return isSameDay(d, targetDate);
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Next upcoming lesson across the schedule (for the empty state footer "Наступна пара: пн, 9 листопада о 08:20")
  const nextFutureLessonText = useMemo(() => {
    const future = filtered
      .filter((item) => {
        const d = new Date(item.date);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return day.getTime() > todayDate.getTime();
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (future.length === 0) return null;
    const first = future[0];
    const d = new Date(first.date);
    const wd = d.toLocaleDateString('uk-UA', { weekday: 'short' }).toLowerCase();
    const dm = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
    return `Наступна пара: ${wd}, ${dm} о ${first.startTime}`;
  }, [filtered, todayDate]);

  // Target date for Today / Tomorrow / Week
  const activeDayForList = useMemo(() => {
    if (tab === 'today') return todayDate;
    if (tab === 'tomorrow') return tomorrowDate;
    if (tab === 'week') return selectedWeekDay;
    return selectedMonthDay;
  }, [tab, todayDate, tomorrowDate, selectedWeekDay, selectedMonthDay]);

  const activeDayLessons = useMemo(
    () => getLessonsForDate(activeDayForList),
    [filtered, activeDayForList]
  );

  // Month grid cells
  const monthGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday = 0 .. Sunday = 6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  }, [calendarMonth]);

  const monthTitle = useMemo(() => {
    const monthNames = [
      'Січень',
      'Лютий',
      'Березень',
      'Квітень',
      'Травень',
      'Червень',
      'Липень',
      'Серпень',
      'Вересень',
      'Жовтень',
      'Листопад',
      'Грудень',
    ];
    return `${monthNames[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
  }, [calendarMonth]);

  const visibleLessons =
    !showAllLessons && activeDayLessons.length > 2
      ? activeDayLessons.slice(0, 2)
      : activeDayLessons;
  const hiddenCount = activeDayLessons.length - visibleLessons.length;

  const nowStr = getNowTimeString(now);

  return (
    <div>
      {/* Title & Group / Classmates header */}
      <div className="stud-page-header">
        <h1 className="stud-h1">Мій розклад</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}</span>
          <button type="button" className="stud-inline-action" onClick={onOpenStudents}>
            Одногрупники →
          </button>
        </div>
      </div>

      {/* Segmented Control: Сьогодні / Завтра / Тиждень / Місяць */}
      <div className="stud-seg-tabs">
        {(
          [
            { id: 'today', label: 'Сьогодні' },
            { id: 'tomorrow', label: 'Завтра' },
            { id: 'week', label: 'Тиждень' },
            { id: 'month', label: 'Місяць' },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`stud-seg-tab ${tab === t.id ? 'stud-seg-tab--active' : ''}`}
            onClick={() => {
              setTab(t.id);
              setShowAllLessons(false);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== SCREEN 03: LOADING STATE ==================== */}
      {loading && (
        <div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
            Оновлюємо розклад...
          </div>
          <div className="stud-skeleton-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="stud-skeleton-card">
                <div className="stud-skel-pill" />
                <div className="stud-skel-lines">
                  <div className="stud-skel-line" style={{ width: '72%' }} />
                  <div className="stud-skel-line" style={{ width: '88%' }} />
                  <div className="stud-skel-line" style={{ width: '48%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== SCREEN 04: ERROR STATE ==================== */}
      {!loading && error && (
        <div className="stud-state-card">
          <div className="stud-state-icon stud-state-icon--warn">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="stud-state-title">Не вдалося завантажити</div>
          <p className="stud-state-desc">
            Перевір з’єднання та спробуй ще раз.
            <br />
            Твої налаштування збережені.
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <button type="button" className="stud-btn-primary" onClick={onRetry}>
              Спробувати ще раз
            </button>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.9rem' }}>
            Якщо помилка повториться — підтримка
          </div>
        </div>
      )}

      {/* ==================== SCREEN 02 (STATES): MONTH VIEW ==================== */}
      {!loading && !error && tab === 'month' && (
        <div>
          <div className="stud-month-header">
            <span className="stud-month-title">{monthTitle}</span>
            <div className="stud-month-nav">
              <button
                type="button"
                className="stud-month-nav-btn"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                  )
                }
                aria-label="Попередній місяць"
              >
                ‹
              </button>
              <button
                type="button"
                className="stud-month-nav-btn"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                  )
                }
                aria-label="Наступний місяць"
              >
                ›
              </button>
            </div>
          </div>

          <div className="stud-calendar-card">
            <div className="stud-cal-weekdays">
              {WEEKDAY_SHORT_UA.map((wd) => (
                <span key={wd} className="stud-cal-wd">
                  {wd}
                </span>
              ))}
            </div>
            <div className="stud-cal-grid">
              {monthGrid.map((cellDate, idx) => {
                if (!cellDate) {
                  return <div key={`empty-${idx}`} className="stud-cal-cell stud-cal-cell--empty" />;
                }
                const dayLessons = getLessonsForDate(cellDate);
                const isSelected = isSameDay(cellDate, selectedMonthDay);
                return (
                  <button
                    key={cellDate.toISOString()}
                    type="button"
                    className={`stud-cal-cell ${isSelected ? 'stud-cal-cell--selected' : ''}`}
                    onClick={() => setSelectedMonthDay(cellDate)}
                  >
                    <span>{cellDate.getDate()}</span>
                    {dayLessons.length > 0 && <span className="stud-cal-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Green Summary Card for Selected Day */}
          <div className="stud-hero-card" style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
              {selectedMonthDay.toLocaleDateString('uk-UA', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.78)', marginBottom: '0.75rem' }}>
              {activeDayLessons.length === 0
                ? 'Пар немає · Вільний день'
                : `${activeDayLessons.length} пар(и) · ${activeDayLessons[0].startTime}–${activeDayLessons[activeDayLessons.length - 1].endTime}`}
            </div>
            <button
              type="button"
              className="stud-hero-footer"
              onClick={() => {
                setSelectedWeekDay(selectedMonthDay);
                setTab('week');
              }}
            >
              <span>Переглянути заняття →</span>
            </button>
          </div>

          <div className="stud-footnote">
            {isDemoData ? 'Демонстраційні дані' : 'Джерело: SUTE'}
          </div>
        </div>
      )}

      {/* ==================== TODAY / TOMORROW / WEEK VIEWS ==================== */}
      {!loading && !error && tab !== 'month' && (
        <div>
          {/* Week 7-day horizontal strip (Screen 02 / Screen 10 Dark) */}
          {tab === 'week' && (
            <div className="stud-week-strip">
              {weekDays.map((d, i) => {
                const isSelected = isSameDay(d, selectedWeekDay);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className={`stud-week-day ${isSelected ? 'stud-week-day--active' : ''}`}
                    onClick={() => {
                      setSelectedWeekDay(d);
                      setShowAllLessons(false);
                    }}
                  >
                    <span className="stud-week-day-name">{WEEKDAY_SHORT_UA[i]}</span>
                    <span className="stud-week-day-num">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Day Header */}
          <div className="stud-day-header">
            <span className="stud-day-title">{formatFullDayLabel(activeDayForList)}</span>
            {activeDayLessons.length > 0 && (
              <span className="stud-day-count">{activeDayLessons.length} пари</span>
            )}
          </div>

          {/* Screen 01 (States): Empty Day ("Сьогодні пар немає") */}
          {activeDayLessons.length === 0 ? (
            <div>
              <div className="stud-state-card">
                <div className="stud-state-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2.4 7.2L22 12l-7.6 1.8L12 21l-2.4-7.2L2 12l7.6-1.8L12 3z" />
                  </svg>
                </div>
                <div className="stud-state-title">
                  {tab === 'tomorrow' ? 'Завтра пар немає' : 'Сьогодні пар немає'}
                </div>
                <p className="stud-state-desc">Час для себе й нових планів.</p>
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="stud-btn-primary"
                    onClick={() => setTab('week')}
                  >
                    Переглянути тиждень
                  </button>
                </div>
              </div>

              {nextFutureLessonText && (
                <div className="stud-footnote">{nextFutureLessonText}</div>
              )}
            </div>
          ) : (
            <div>
              <div className="stud-lessons-stack">
                {visibleLessons.map((item, idx) => {
                  const isToday = isSameDay(activeDayForList, todayDate);
                  const isNow = isToday && nowStr >= item.startTime && nowStr <= item.endTime;
                  const isOnline =
                    !item.classroom ||
                    item.classroom.toLowerCase().includes('онлайн') ||
                    item.classroom.toLowerCase().includes('дист');

                  return (
                    <div
                      key={item.id || idx}
                      className={`stud-lesson-card ${isNow ? 'stud-lesson-card--now' : ''}`}
                      onClick={() => onSelectLesson(item)}
                    >
                      <div className="stud-lesson-time">
                        <span className="stud-lesson-start">{item.startTime}</span>
                        <span className="stud-lesson-end">{item.endTime}</span>
                      </div>
                      <div className="stud-lesson-info">
                        <div className="stud-lesson-type">
                          {item.lessonNumber} ПАРА · {typeLabel(item.type).toUpperCase()}
                        </div>
                        <div className="stud-lesson-subj">{item.subject}</div>
                        {item.teacher && (
                          <div className="stud-lesson-teacher">{item.teacher}</div>
                        )}
                        <div>
                          <span className="stud-online-chip stud-online-chip--light">
                            {isOnline ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="23 7 16 12 23 17 23 7" />
                                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                                Онлайн
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                Ауд. {item.classroom}
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="stud-more-lessons-btn"
                  onClick={() => setShowAllLessons(true)}
                >
                  Ще {hiddenCount} пари нижче ↓
                </button>
              )}

              {showAllLessons && activeDayLessons.length > 2 && (
                <button
                  type="button"
                  className="stud-more-lessons-btn"
                  onClick={() => setShowAllLessons(false)}
                >
                  Згорнути ↑
                </button>
              )}

              <div className="stud-footnote">
                {isDemoData ? 'Демонстраційні дані · Джерело: SUTE' : 'Джерело: SUTE'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
