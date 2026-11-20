import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Faculty, Group, SavedFriendGroup, ScheduleItem, Tab } from '../../types';
import { filterBySubgroup } from '../../utils/subgroupFilter';
import {
  BELL_SCHEDULE,
  DEMO_GROUPS_BY_FACULTY,
  generateDemoSchedule,
  typeLabel,
  getNowTimeString,
} from '../../utils/constants';
import { API, fetchApi } from '../../utils/api';
import { Modal } from '../common/Modal';

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
  faculties?: Faculty[];
  onRetry?: () => void;
  onOpenStudents: () => void;
  onSelectLesson: (lesson: ScheduleItem) => void;
}

const WEEKDAY_SHORT_UA = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const SAVED_FRIENDS_KEY = 'dteu_saved_friends_v1';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
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

function extractBuildingCode(classroom?: string | null): string | null {
  if (!classroom) return null;
  const lower = classroom.toLowerCase();
  if (lower.includes('онлайн') || lower.includes('дист')) return null;
  const m = classroom.match(/([А-ЯІЄЇҐa-zA-Z])\s*[-–]?\s*\d{1,4}/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Generates a realistic distinct demo schedule for a friend's group
 * so even when testing offline or with demo groups, the user sees realistic
 * shared windows, different classes, and building overlaps.
 */
function generateFriendDemoSchedule(groupId: string, referenceDate: Date = new Date()): ScheduleItem[] {
  const base = generateDemoSchedule(referenceDate);
  // Shift / customize some lessons for the friend's group so comparison is meaningful
  const hash = groupId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const altSubjects = [
    'Корпоративні фінанси та аудит',
    'Інформаційні системи в менеджменті',
    'Міжнародна економіка',
    'Бізнес-аналітика та Data Science',
  ];
  const altClassrooms = ['А-305', 'Онлайн', 'Д-210', 'Б-204'];

  return base
    .filter((_, idx) => (idx + hash) % 4 !== 1) // Leave a free window on some lessons!
    .map((item, idx) => ({
      ...item,
      id: `${groupId}-${item.id}`,
      subject: idx % 2 === 0 ? altSubjects[(idx + hash) % altSubjects.length] : item.subject,
      classroom: altClassrooms[(idx + hash) % altClassrooms.length],
    }));
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
  faculties = [],
  onRetry,
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

  // ==================== MULTI-SCHEDULE STATE ====================
  const [savedFriends, setSavedFriends] = useState<SavedFriendGroup[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_FRIENDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 'my' = own schedule, otherwise friend'sSavedFriendGroup.id
  const [activeTargetId, setActiveTargetId] = useState<string>('my');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareFriendId, setCompareFriendId] = useState<string>('');

  // Cache of fetched friend schedules by groupId
  const [friendSchedulesMap, setFriendSchedulesMap] = useState<Record<string, ScheduleItem[]>>({});
  const [friendLoadingId, setFriendLoadingId] = useState<string | null>(null);

  // Add Friend Group Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalFacId, setModalFacId] = useState<string>(faculties[0]?.id || '6');
  const [modalGroups, setModalGroups] = useState<Group[]>([]);
  const [modalGroupSearch, setModalGroupSearch] = useState('');
  const [modalSelectedGroup, setModalSelectedGroup] = useState<Group | null>(null);
  const [modalFriendLabel, setModalFriendLabel] = useState('');
  const [modalSubgroup, setModalSubgroup] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_FRIENDS_KEY, JSON.stringify(savedFriends));
    } catch {
      /* ignore */
    }
  }, [savedFriends]);

  // Ensure compareFriendId points to a valid friend when compare mode is toggled
  useEffect(() => {
    if (savedFriends.length === 0) {
      setIsCompareMode(false);
      setCompareFriendId('');
      if (activeTargetId !== 'my') setActiveTargetId('my');
      return;
    }
    if (!compareFriendId || !savedFriends.some((f) => f.id === compareFriendId)) {
      const candidate =
        activeTargetId !== 'my' && savedFriends.some((f) => f.id === activeTargetId)
          ? activeTargetId
          : savedFriends[0].id;
      setCompareFriendId(candidate);
    }
  }, [savedFriends, activeTargetId, compareFriendId]);

  const loadFriendSchedule = async (friend: SavedFriendGroup) => {
    if (friendSchedulesMap[friend.groupId]) return;
    setFriendLoadingId(friend.id);

    if (friend.groupId.startsWith('demo-')) {
      setFriendSchedulesMap((prev) => ({
        ...prev,
        [friend.groupId]: generateFriendDemoSchedule(friend.groupId, new Date()),
      }));
      setFriendLoadingId(null);
      return;
    }

    try {
      const res = await fetchApi(`${API}/api/schedule?groupId=${friend.groupId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const list =
        Array.isArray(data) && data.length > 0
          ? data
          : generateFriendDemoSchedule(friend.groupId, new Date());
      setFriendSchedulesMap((prev) => ({ ...prev, [friend.groupId]: list }));
    } catch {
      setFriendSchedulesMap((prev) => ({
        ...prev,
        [friend.groupId]: generateFriendDemoSchedule(friend.groupId, new Date()),
      }));
    } finally {
      setFriendLoadingId(null);
    }
  };

  // Load groups inside Add Friend Modal when faculty changes
  useEffect(() => {
    if (!isAddModalOpen || !modalFacId) return;
    let cancelled = false;

    const loadGroupsForModal = async () => {
      try {
        const coursesRes = await fetchApi(`${API}/api/courses?facultyId=${modalFacId}`);
        const coursesList: { id: string }[] = coursesRes.ok
          ? await coursesRes.json()
          : [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
        const cIds =
          Array.isArray(coursesList) && coursesList.length > 0
            ? coursesList.map((c) => c.id)
            : ['1', '2', '3', '4'];

        const arrays = await Promise.all(
          cIds.map(async (cid) => {
            try {
              const r = await fetchApi(`${API}/api/groups?facultyId=${modalFacId}&course=${cid}`);
              return r.ok ? await r.json() : [];
            } catch {
              return [];
            }
          })
        );
        const flat: Group[] = arrays.flat();
        if (!cancelled) {
          if (flat.length > 0) {
            flat.sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            );
            setModalGroups(flat);
            setModalSelectedGroup(flat[0]);
          } else {
            const fallback = DEMO_GROUPS_BY_FACULTY[modalFacId] || DEMO_GROUPS_BY_FACULTY['6'];
            setModalGroups(fallback);
            setModalSelectedGroup(fallback[0]);
          }
        }
      } catch {
        if (!cancelled) {
          const fallback = DEMO_GROUPS_BY_FACULTY[modalFacId] || DEMO_GROUPS_BY_FACULTY['6'];
          setModalGroups(fallback);
          setModalSelectedGroup(fallback[0]);
        }
      }
    };

    loadGroupsForModal();
    return () => {
      cancelled = true;
    };
  }, [isAddModalOpen, modalFacId]);

  const activeFriendObj = useMemo(
    () => savedFriends.find((f) => f.id === activeTargetId) || null,
    [savedFriends, activeTargetId]
  );

  const compareFriendObj = useMemo(
    () => savedFriends.find((f) => f.id === compareFriendId) || savedFriends[0] || null,
    [savedFriends, compareFriendId]
  );

  // Automatically fetch friend schedule whenever selected or compared
  useEffect(() => {
    if (activeFriendObj) {
      loadFriendSchedule(activeFriendObj);
    }
  }, [activeFriendObj]);

  useEffect(() => {
    if (isCompareMode && compareFriendObj) {
      loadFriendSchedule(compareFriendObj);
    }
  }, [isCompareMode, compareFriendObj]);

  const handleAddFriendGroup = () => {
    if (!modalSelectedGroup) return;
    const newEntry: SavedFriendGroup = {
      id: `friend-${modalSelectedGroup.id}-${Date.now()}`,
      groupId: modalSelectedGroup.id,
      groupName: modalSelectedGroup.name,
      label: modalFriendLabel.trim(),
      subgroup: modalSubgroup,
    };
    setSavedFriends((prev) => [...prev, newEntry]);
    setActiveTargetId(newEntry.id);
    setCompareFriendId(newEntry.id);
    setIsAddModalOpen(false);
    setModalFriendLabel('');
    setModalGroupSearch('');
    setModalSubgroup(0);
  };

  const handleRemoveFriendGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedFriends((prev) => prev.filter((f) => f.id !== id));
    if (activeTargetId === id) setActiveTargetId('my');
  };

  // ==================== SCHEDULE FILTERING ====================
  const myFiltered = useMemo(
    () => filterBySubgroup(schedule, effectiveSubgroup),
    [schedule, effectiveSubgroup]
  );

  const activeFilteredSchedule = useMemo(() => {
    if (!activeFriendObj) return myFiltered;
    const rawFriend = friendSchedulesMap[activeFriendObj.groupId] || [];
    return filterBySubgroup(rawFriend, activeFriendObj.subgroup);
  }, [activeFriendObj, myFiltered, friendSchedulesMap]);

  const compareFriendFiltered = useMemo(() => {
    if (!compareFriendObj) return [];
    const rawFriend = friendSchedulesMap[compareFriendObj.groupId] || [];
    return filterBySubgroup(rawFriend, compareFriendObj.subgroup);
  }, [compareFriendObj, friendSchedulesMap]);

  // Selected day for the Week tab
  const [selectedWeekDay, setSelectedWeekDay] = useState<Date>(() => {
    const mon = getMondayOfWeek(todayDate);
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

  const weekDays = useMemo(() => {
    const base = getMondayOfWeek(selectedWeekDay);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [selectedWeekDay]);

  const getLessonsForDateFromList = (list: ScheduleItem[], targetDate: Date): ScheduleItem[] => {
    return list
      .filter((item) => {
        const d = new Date(item.date);
        return isSameDay(d, targetDate);
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getLessonsForDate = (targetDate: Date): ScheduleItem[] =>
    getLessonsForDateFromList(activeFilteredSchedule, targetDate);

  const nextFutureLessonText = useMemo(() => {
    const future = activeFilteredSchedule
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
  }, [activeFilteredSchedule, todayDate]);

  const activeDayForList = useMemo(() => {
    if (tab === 'today') return todayDate;
    if (tab === 'tomorrow') return tomorrowDate;
    if (tab === 'week') return selectedWeekDay;
    return selectedMonthDay;
  }, [tab, todayDate, tomorrowDate, selectedWeekDay, selectedMonthDay]);

  const activeDayLessons = useMemo(
    () => getLessonsForDate(activeDayForList),
    [activeFilteredSchedule, activeDayForList]
  );

  // ==================== COMPARE MODE COMPUTATION ====================
  const myDayLessons = useMemo(
    () => getLessonsForDateFromList(myFiltered, activeDayForList),
    [myFiltered, activeDayForList]
  );

  const friendDayLessons = useMemo(
    () => getLessonsForDateFromList(compareFriendFiltered, activeDayForList),
    [compareFriendFiltered, activeDayForList]
  );

  const comparisonSlots = useMemo(() => {
    if (!isCompareMode || !compareFriendObj) return [];

    // Find min and max lesson number across both schedules today
    const allNums = [
      ...myDayLessons.map((l) => l.lessonNumber),
      ...friendDayLessons.map((l) => l.lessonNumber),
    ].filter(Boolean);

    if (allNums.length === 0) return [];
    const minNum = Math.min(...allNums);
    const maxNum = Math.max(...allNums);

    const slots: {
      lessonNumber: number;
      startTime: string;
      endTime: string;
      myLesson: ScheduleItem | null;
      friendLesson: ScheduleItem | null;
      statusBadge: string;
      isSharedWindow: boolean;
      isSameBuilding: boolean;
    }[] = [];

    for (let n = minNum; n <= maxNum; n++) {
      const bell = BELL_SCHEDULE.find((b) => b.n === n) || {
        n,
        start: '08:20',
        end: '09:40',
      };
      const myL = myDayLessons.find((l) => l.lessonNumber === n) || null;
      const frL = friendDayLessons.find((l) => l.lessonNumber === n) || null;

      if (!myL && !frL) {
        slots.push({
          lessonNumber: n,
          startTime: bell.start,
          endTime: bell.end,
          myLesson: null,
          friendLesson: null,
          statusBadge: '✨ Спільне вікно!',
          isSharedWindow: true,
          isSameBuilding: false,
        });
      } else {
        const myBld = extractBuildingCode(myL?.classroom);
        const frBld = extractBuildingCode(frL?.classroom);
        const sameBuilding = Boolean(myBld && frBld && myBld === frBld);

        let statusBadge = `${n} ПАРА`;
        if (sameBuilding) {
          statusBadge = `📍 Разом у корпусі ${myBld}`;
        } else if (myL && !frL) {
          statusBadge = `У друга вікно`;
        } else if (!myL && frL) {
          statusBadge = `У тебе вікно`;
        }

        slots.push({
          lessonNumber: n,
          startTime: myL?.startTime || frL?.startTime || bell.start,
          endTime: myL?.endTime || frL?.endTime || bell.end,
          myLesson: myL,
          friendLesson: frL,
          statusBadge,
          isSharedWindow: false,
          isSameBuilding: sameBuilding,
        });
      }
    }

    return slots;
  }, [isCompareMode, compareFriendObj, myDayLessons, friendDayLessons]);

  const compareSummaryText = useMemo(() => {
    if (!isCompareMode || !compareFriendObj) return null;
    if (myDayLessons.length === 0 && friendDayLessons.length === 0) {
      return 'У вас обох сьогодні немає пар — увесь день вільний!';
    }
    if (myDayLessons.length === 0) {
      const frEnd = friendDayLessons[friendDayLessons.length - 1]?.endTime;
      return `У тебе сьогодні пар немає. Друг звільняється о ${frEnd}.`;
    }
    if (friendDayLessons.length === 0) {
      const myEnd = myDayLessons[myDayLessons.length - 1]?.endTime;
      return `У друга сьогодні пар немає. Ти звільняєшся о ${myEnd}.`;
    }

    const myEnd = myDayLessons[myDayLessons.length - 1].endTime;
    const frEnd = friendDayLessons[friendDayLessons.length - 1].endTime;
    const sharedWindows = comparisonSlots.filter((s) => s.isSharedWindow).length;
    const freeAfter = myEnd > frEnd ? myEnd : frEnd;

    if (myEnd === frEnd) {
      return `Закінчуєте одночасно о ${myEnd}!${sharedWindows > 0 ? ` Є спільних вікон: ${sharedWindows}.` : ' Ідеально, щоб зустрітися після пар.'}`;
    }
    return `Разом вільні після ${freeAfter} (ти до ${myEnd}, друг до ${frEnd}).`;
  }, [isCompareMode, compareFriendObj, myDayLessons, friendDayLessons, comparisonSlots]);

  // Month grid cells
  const monthGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
  const isCurrentLoading = loading || (activeFriendObj && friendLoadingId === activeFriendObj.id);

  const currentSubtitleLabel = useMemo(() => {
    if (isCompareMode && compareFriendObj) {
      return `${selectedGroup?.name || 'Моя група'} ⇄ ${compareFriendObj.groupName}${compareFriendObj.label ? ` (${compareFriendObj.label})` : ''}`;
    }
    if (activeFriendObj) {
      return `ДТЕУ · ${activeFriendObj.groupName}${activeFriendObj.label ? ` · ${activeFriendObj.label}` : ' · Група друга'}`;
    }
    return `ДТЕУ · ${selectedGroup?.name || 'ФТМ 3-10'}`;
  }, [isCompareMode, compareFriendObj, activeFriendObj, selectedGroup]);

  const filteredModalGroups = useMemo(() => {
    const q = modalGroupSearch.trim().toLowerCase();
    if (!q) return modalGroups;
    return modalGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [modalGroups, modalGroupSearch]);

  return (
    <div className="stud-anim-in">
      {/* Title & Subtitle */}
      <div className="stud-page-header" style={{ marginBottom: '0.65rem' }}>
        <h1 className="stud-h1">Мій розклад</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">{currentSubtitleLabel}</span>
          {savedFriends.length > 0 && (
            <button
              type="button"
              className="stud-inline-action"
              style={{
                color: isCompareMode ? 'var(--accent-forest-text)' : undefined,
              }}
              onClick={() => {
                setIsCompareMode((v) => !v);
                if (tab === 'month') setTab('week');
              }}
            >
              {isCompareMode ? '✕ Вийти з порівняння' : '⇄ Порівняти'}
            </button>
          )}
        </div>
      </div>

      {/* ==================== MULTI-SCHEDULE GROUP BAR (Variant 3) ==================== */}
      <div className="stud-multi-bar">
        {/* Own Group Chip */}
        <button
          type="button"
          className={`stud-group-chip ${!isCompareMode && activeTargetId === 'my' ? 'stud-group-chip--active' : ''}`}
          onClick={() => {
            setIsCompareMode(false);
            setActiveTargetId('my');
          }}
        >
          <span className="stud-group-chip-dot" />
          <span>{selectedGroup?.name || 'Моя група'} (Моя)</span>
        </button>

        {/* Saved Friends' Group Chips */}
        {savedFriends.map((fr) => {
          const isSelectedSingle = !isCompareMode && activeTargetId === fr.id;
          const isSelectedCompare = isCompareMode && compareFriendObj?.id === fr.id;
          return (
            <button
              key={fr.id}
              type="button"
              className={`stud-group-chip ${
                isSelectedSingle
                  ? 'stud-group-chip--active'
                  : isSelectedCompare
                  ? 'stud-group-chip--compare-active'
                  : ''
              }`}
              onClick={() => {
                if (isCompareMode) {
                  setCompareFriendId(fr.id);
                } else {
                  setActiveTargetId(fr.id);
                }
              }}
            >
              <span>
                {fr.groupName}
                {fr.label ? ` · ${fr.label}` : ''}
              </span>
              <span
                className="stud-group-chip-del"
                title="Видалити групу друга"
                onClick={(e) => handleRemoveFriendGroup(fr.id, e)}
              >
                ✕
              </span>
            </button>
          );
        })}

        {/* Compare Toggle Chip (if at least 1 friend saved) */}
        {savedFriends.length > 0 && (
          <button
            type="button"
            className={`stud-group-chip ${isCompareMode ? 'stud-group-chip--compare-active' : 'stud-group-chip--compare'}`}
            onClick={() => {
              setIsCompareMode((v) => !v);
              if (tab === 'month') setTab('week');
            }}
          >
            <span>⇄ Спільні вікна</span>
          </button>
        )}

        {/* + Add Friend Group Button */}
        <button
          type="button"
          className="stud-group-chip"
          style={{ borderStyle: 'dashed' }}
          onClick={() => setIsAddModalOpen(true)}
        >
          <span>+ Група друга</span>
        </button>
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
      {isCurrentLoading && (
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
      {!isCurrentLoading && error && (
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

      {/* ==================== COMPARE MODE VIEW (Side-by-Side + Shared Windows) ==================== */}
      {!isCurrentLoading && !error && isCompareMode && compareFriendObj && (
        <div>
          {tab === 'week' && (
            <div className="stud-week-strip">
              {weekDays.map((d, i) => {
                const isSelected = isSameDay(d, selectedWeekDay);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className={`stud-week-day ${isSelected ? 'stud-week-day--active' : ''}`}
                    onClick={() => setSelectedWeekDay(d)}
                  >
                    <span className="stud-week-day-name">{WEEKDAY_SHORT_UA[i]}</span>
                    <span className="stud-week-day-num">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Smart Summary Banner */}
          <div className="stud-compare-summary">
            <div className="stud-hero-eyebrow">
              ПОРІВНЯННЯ РОЗКЛАДІВ · {selectedGroup?.name || 'МОЯ'} ⇄ {compareFriendObj.groupName}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.35 }}>
              {compareSummaryText}
            </div>
          </div>

          <div className="stud-day-header">
            <span className="stud-day-title">{formatFullDayLabel(activeDayForList)}</span>
            <span className="stud-day-count">
              Ти: {myDayLessons.length} · {compareFriendObj.label || compareFriendObj.groupName}: {friendDayLessons.length}
            </span>
          </div>

          {comparisonSlots.length === 0 ? (
            <div className="stud-state-card">
              <div className="stud-state-icon">✨</div>
              <div className="stud-state-title">У вас обох вільний день!</div>
              <p className="stud-state-desc">Жодної пари ні у тебе, ні в друга — чудовий час для зустрічі.</p>
            </div>
          ) : (
            <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {comparisonSlots.map((slot) => (
                <div
                  key={slot.lessonNumber}
                  className={`stud-compare-slot ${
                    slot.isSharedWindow || slot.isSameBuilding ? 'stud-compare-slot--window' : ''
                  }`}
                >
                  <div className="stud-compare-slot-head">
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {slot.lessonNumber} пара · {slot.startTime}–{slot.endTime}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.22rem 0.6rem',
                        borderRadius: '999px',
                        background:
                          slot.isSharedWindow || slot.isSameBuilding
                            ? 'var(--accent-lime)'
                            : 'var(--bg-surface-alt)',
                        color:
                          slot.isSharedWindow || slot.isSameBuilding
                            ? '#07140E'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {slot.statusBadge}
                    </span>
                  </div>

                  <div className="stud-compare-cols">
                    {/* My Side */}
                    <div
                      className={`stud-compare-side ${!slot.myLesson ? 'stud-compare-side--free' : ''}`}
                      onClick={() => slot.myLesson && onSelectLesson(slot.myLesson)}
                      style={{ cursor: slot.myLesson ? 'pointer' : 'default' }}
                    >
                      <span className="stud-compare-side-tag">
                        ВИ ({selectedGroup?.name || 'Моя'})
                      </span>
                      {slot.myLesson ? (
                        <>
                          <div className="stud-compare-side-subj">{slot.myLesson.subject}</div>
                          <div className="stud-compare-side-meta">
                            {typeLabel(slot.myLesson.type)} · {slot.myLesson.classroom || 'Онлайн'}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Вільно (Вікно)
                        </div>
                      )}
                    </div>

                    {/* Friend Side */}
                    <div
                      className={`stud-compare-side ${!slot.friendLesson ? 'stud-compare-side--free' : ''}`}
                      onClick={() => slot.friendLesson && onSelectLesson(slot.friendLesson)}
                      style={{ cursor: slot.friendLesson ? 'pointer' : 'default' }}
                    >
                      <span className="stud-compare-side-tag">
                        {compareFriendObj.label
                          ? `${compareFriendObj.label} (${compareFriendObj.groupName})`
                          : compareFriendObj.groupName}
                      </span>
                      {slot.friendLesson ? (
                        <>
                          <div className="stud-compare-side-subj">{slot.friendLesson.subject}</div>
                          <div className="stud-compare-side-meta">
                            {typeLabel(slot.friendLesson.type)} · {slot.friendLesson.classroom || 'Онлайн'}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Вільно (Вікно)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== SCREEN 02 (STATES): MONTH VIEW ==================== */}
      {!isCurrentLoading && !error && !isCompareMode && tab === 'month' && (
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
      {!isCurrentLoading && !error && !isCompareMode && tab !== 'month' && (
        <div>
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

          {/* Empty Day ("Сьогодні пар немає") */}
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
              <div className="stud-lessons-stack stud-stagger">
                {visibleLessons.map((item, idx) => {
                  const isToday = isSameDay(activeDayForList, todayDate);
                  const isNow = isToday && nowStr >= item.startTime && nowStr <= item.endTime;
                  const isOnline =
                    !item.classroom ||
                    item.classroom.toLowerCase().includes('онлайн') ||
                    item.classroom.toLowerCase().includes('дист');

                  return (
                    <motion.div
                      whileTap={{ scale: 0.985 }}
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
                    </motion.div>
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

      {/* ==================== MODAL: ADD FRIEND'S GROUP ==================== */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div style={{ padding: '1.35rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            Додати групу друга
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
            Перемикайся в один клік або порівнюй спільні вікна без зміни своєї групи.
          </p>

          <div className="stud-form-group">
            <label className="stud-label">ІМ’Я ДРУГА / ПІДПИС (НЕОБОВ’ЯЗКОВО)</label>
            <input
              type="text"
              className="stud-input"
              placeholder="Наприклад: Макс, Аліна..."
              value={modalFriendLabel}
              onChange={(e) => setModalFriendLabel(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="stud-form-group">
            <label className="stud-label">ФАКУЛЬТЕТ</label>
            <select
              className="stud-select"
              value={modalFacId}
              onChange={(e) => setModalFacId(e.target.value)}
            >
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="stud-form-group">
            <label className="stud-label">ПОШУК ТА ВИБІР ГРУПИ</label>
            <input
              type="text"
              className="stud-input"
              placeholder="Швидкий фільтр (напр. 2-6, 3-10)..."
              value={modalGroupSearch}
              onChange={(e) => {
                setModalGroupSearch(e.target.value);
                const q = e.target.value.trim().toLowerCase();
                const firstMatch = modalGroups.find((g) => g.name.toLowerCase().includes(q));
                if (firstMatch) setModalSelectedGroup(firstMatch);
              }}
              style={{ marginBottom: '0.5rem' }}
            />
            <select
              className="stud-select"
              value={modalSelectedGroup?.id || ''}
              onChange={(e) => {
                const g = modalGroups.find((x) => x.id === e.target.value);
                if (g) setModalSelectedGroup(g);
              }}
            >
              {filteredModalGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="stud-form-group">
            <label className="stud-label">ПІДГРУПА ДРУГА</label>
            <select
              className="stud-select"
              value={modalSubgroup}
              onChange={(e) => setModalSubgroup(parseInt(e.target.value, 10))}
            >
              <option value={0}>Усі пари групи</option>
              <option value={1}>1 підгрупа</option>
              <option value={2}>2 підгрупа</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem' }}>
            <button
              type="button"
              className="stud-btn-soft"
              onClick={() => setIsAddModalOpen(false)}
            >
              Скасувати
            </button>
            <button
              type="button"
              className="stud-btn-primary"
              disabled={!modalSelectedGroup}
              onClick={handleAddFriendGroup}
            >
              Додати групу
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
