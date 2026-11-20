import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';
import type { Faculty, Group, ScheduleItem, Student, Tab, Page, NavTab, StudEvent } from './types';
import { API, fetchApi, getTelegramId } from './utils/api';
import {
  DEFAULT_FACULTIES,
  DEMO_GROUPS_BY_FACULTY,
  DEMO_EVENTS,
  generateDemoSchedule,
} from './utils/constants';
import { fetchUniversityEvents } from './utils/suteEvents';
import { useLiveClock } from './hooks/useLiveClock';
import { useTelegram } from './hooks/useTelegram';
import { useTheme } from './hooks/useTheme';
import { TopHeader, BottomNav } from './components/layout/StudLayout';
import { Modal } from './components/common/Modal';
import { SetupWizard } from './components/setup/SetupWizard';
import { HomeView } from './components/home/HomeView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { LessonDetailView } from './components/schedule/LessonDetailView';
import { ServicesView, CampusView, DirectoryView, CommunityView } from './components/services/ServicesView';
import { BellsView } from './components/bells/BellsView';
import { EventsView, EventDetailView } from './components/events/EventsView';
import { ProfileView, NotificationsView, SupportView } from './components/profile/ProfileView';
import { StudentsView } from './components/students/StudentsView';
import { AdminPanel } from './components/admin/AdminPanel';
import { GradesView } from './components/grades/GradesView';
import { TeacherSchedule } from './components/teachers/TeacherSchedule';
import { SearchView } from './components/search/SearchView';

function App() {
  const [page, setPage] = useState<Page>('setup');
  const [adminSecret, setAdminSecret] = useState(localStorage.getItem('dteu_admin_secret') || '');
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);

  const [tab, setTab] = useState<Tab>('today');
  const [userName, setUserName] = useState('');
  const [faculties, setFaculties] = useState<Faculty[]>(DEFAULT_FACULTIES);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedLesson, setSelectedLesson] = useState<ScheduleItem | null>(null);
  const [events, setEvents] = useState<StudEvent[]>(DEMO_EVENTS);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<StudEvent>(DEMO_EVENTS[0]);

  const [subgroupOverride, setSubgroupOverride] = useState<number>(0);
  const [notify15Min, setNotify15Min] = useState(true);
  const [notify1Min, setNotify1Min] = useState(false);
  const [notifyMorning, setNotifyMorning] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(false);
  const [remindMinutes, setRemindMinutes] = useState<number>(10);

  const now = useLiveClock();
  const { openLink, haptic } = useTelegram();
  useTheme();

  const navigateTo = (target: Page) => {
    haptic('light');
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==================== DATA FETCHING ====================

  const fetchFaculties = async () => {
    try {
      const res = await fetchApi(`${API}/api/faculties`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setFaculties(data);
        return;
      }
      setFaculties(DEFAULT_FACULTIES);
    } catch {
      setFaculties(DEFAULT_FACULTIES);
    }
  };

  const fetchAllGroupsForFaculty = async (fid: string) => {
    if (!fid) {
      setGroups([]);
      return;
    }

    try {
      const coursesRes = await fetchApi(`${API}/api/courses?facultyId=${fid}`);
      if (!coursesRes.ok) throw new Error('Courses fetch failed');
      const coursesList: { id: string; name: string }[] = await coursesRes.json();
      setCourses(coursesList);

      const courseIds =
        Array.isArray(coursesList) && coursesList.length > 0
          ? coursesList.map((c) => c.id)
          : ['1', '2', '3', '4'];

      const groupArrays = await Promise.all(
        courseIds.map(async (cid) => {
          try {
            const gRes = await fetchApi(`${API}/api/groups?facultyId=${fid}&course=${cid}`);
            if (!gRes.ok) return [];
            const gData = await gRes.json();
            return Array.isArray(gData) ? gData : [];
          } catch {
            return [];
          }
        })
      );

      const combined: Group[] = groupArrays.flat();
      if (combined.length > 0) {
        combined.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
        setGroups(combined);
        return;
      }
      setGroups(DEMO_GROUPS_BY_FACULTY[fid] || DEMO_GROUPS_BY_FACULTY['6']);
    } catch {
      setCourses([
        { id: '1', name: '1' },
        { id: '2', name: '2' },
        { id: '3', name: '3' },
        { id: '4', name: '4' },
      ]);
      setGroups(DEMO_GROUPS_BY_FACULTY[fid] || DEMO_GROUPS_BY_FACULTY['6']);
    }
  };

  const fetchSchedule = async (gid: string) => {
    setLoading(true);
    setScheduleError(false);

    if (gid.startsWith('demo-')) {
      setSchedule(generateDemoSchedule(new Date()));
      setIsDemoData(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetchApi(`${API}/api/schedule?groupId=${gid}`);
      if (!res.ok) throw new Error('Schedule error');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSchedule(data);
        setIsDemoData(false);
      } else {
        setSchedule(generateDemoSchedule(new Date()));
        setIsDemoData(true);
      }
    } catch {
      setSchedule(generateDemoSchedule(new Date()));
      setIsDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (gid: string) => {
    if (gid.startsWith('demo-')) {
      setStudents([]);
      return;
    }
    try {
      const res = await fetchApi(`${API}/api/groups/students?groupId=${gid}`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    }
  };

  const loadLiveEvents = async () => {
    setEventsLoading(true);
    try {
      const live = await fetchUniversityEvents();
      if (Array.isArray(live) && live.length > 0) {
        setEvents(live);
        setSelectedEvent((prev) => live.find((e) => e.id === prev.id) || live[0]);
      }
    } catch {
      // Keep fallback DEMO_EVENTS if completely offline
    } finally {
      setEventsLoading(false);
    }
  };

  // ==================== INIT ====================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const explicitChatId = params.get('chatId');

    if (explicitChatId) {
      setPage('group-setup');
      fetchFaculties();
    loadLiveEvents();
      return;
    }

    const secret = params.get('admin') || window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (secret) {
      setAdminSecret(secret);
      setPage('admin');
      return;
    }

    fetchFaculties();
    loadLiveEvents();

    const id = localStorage.getItem('dteu_group_id');
    const name = localStorage.getItem('dteu_group_name');
    const savedFac = localStorage.getItem('dteu_faculty_id') || '6';
    setSelectedFaculty(savedFac);
    setUserName(localStorage.getItem('dteu_user_name') || '');
    setSubgroupOverride(parseInt(localStorage.getItem('dteu_subgroup_override') || '0', 10));

    if (id && name) {
      setSelectedGroup({ id, name, course: 0 });
      setPage('home');
      fetchSchedule(id);
      fetchStudents(id);
      fetchAllGroupsForFaculty(savedFac);
    } else {
      fetchAllGroupsForFaculty(savedFac);
    }

    const telegramId = getTelegramId();
    if (telegramId) {
      fetchApi(`${API}/api/users/preferences?telegramId=${telegramId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.notify15Min !== undefined) setNotify15Min(data.notify15Min);
          if (data.notify1Min !== undefined) setNotify1Min(data.notify1Min);
          if (data.notifyMorning !== undefined) setNotifyMorning(data.notifyMorning);
          if (data.notifyChanges !== undefined) setNotifyChanges(data.notifyChanges);
        })
        .catch(() => {});
    }
  }, []);

  // ==================== COMPUTED VALUES ====================

  const [matchedStudentIndex, autoSubgroup] = useMemo(() => {
    if (!userName.trim() || students.length === 0) return [-1, 0];
    const parts = userName.toLowerCase().trim().split(/\s+/);
    const index = students.findIndex((s) => {
      const fn = s.fullName.toLowerCase();
      return parts.every((p) => fn.includes(p));
    });
    if (index === -1) return [-1, 0];
    const mid = Math.ceil(students.length / 2);
    return [index, index < mid ? 1 : 2];
  }, [userName, students]);

  const effectiveSubgroup =
    matchedStudentIndex === -1
      ? subgroupOverride
      : subgroupOverride !== 0
      ? subgroupOverride
      : autoSubgroup;

  // ==================== HANDLERS ====================

  const onFacultyChange = (fid: string) => {
    setSelectedFaculty(fid);
    setSelectedCourse('');
    setSelectedGroup(null);
    if (fid) {
      fetchAllGroupsForFaculty(fid);
    } else {
      setGroups([]);
    }
  };

  const onCourseChange = async (cid: string) => {
    setSelectedCourse(cid);
    setSelectedGroup(null);
    if (cid && selectedFaculty) {
      try {
        const res = await fetchApi(`${API}/api/groups?facultyId=${selectedFaculty}&course=${cid}`);
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      } catch {
        setGroups(DEMO_GROUPS_BY_FACULTY[selectedFaculty] || []);
      }
    }
  };

  const onFinishSetup = async () => {
    if (!selectedGroup) return;
    haptic('medium');
    localStorage.setItem('dteu_group_id', selectedGroup.id);
    localStorage.setItem('dteu_group_name', selectedGroup.name);
    localStorage.setItem('dteu_faculty_id', selectedFaculty || '6');
    localStorage.setItem('dteu_user_name', userName.trim());
    localStorage.setItem('dteu_subgroup_override', subgroupOverride.toString());

    navigateTo('home');
    fetchSchedule(selectedGroup.id);
    fetchStudents(selectedGroup.id);

    const telegramId = getTelegramId();
    if (telegramId) {
      try {
        const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const fullName =
          userName.trim() || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Student';
        await fetchApi(`${API}/api/users/student`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            groupId: selectedGroup.id,
            fullName,
            subgroup: effectiveSubgroup,
          }),
        });
      } catch {}
    }
  };

  const onSaveGroupSetup = async () => {
    if (!selectedGroup) return;
    const telegramId = getTelegramId();
    if (telegramId) {
      try {
        await fetchApi(`${API}/api/users/student`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            groupId: selectedGroup.id,
            fullName: 'Group Chat',
            subgroup: effectiveSubgroup,
          }),
        });
        await fetchApi(`${API}/api/users/preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            notifyMorning: true,
            subgroup: effectiveSubgroup,
          }),
        });
        navigateTo('group-setup-success');
      } catch {}
    }
  };

  const savePreferences = async () => {
    const telegramId = getTelegramId();
    if (telegramId) {
      try {
        await fetchApi(`${API}/api/users/preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            notify15Min,
            notify1Min,
            notifyMorning,
            notifyChanges,
            subgroup: effectiveSubgroup,
          }),
        });
      } catch {}
    }
  };

  const handleSaveProfileIdentity = async (newName: string, newSub: number) => {
    const trimmed = newName.trim();
    setUserName(trimmed);
    setSubgroupOverride(newSub);
    localStorage.setItem('dteu_user_name', trimmed);
    localStorage.setItem('dteu_subgroup_override', newSub.toString());
    await savePreferences();
  };

  // ==================== NAVIGATION MAPPING ====================

  const isOnboardingPage =
    page === 'setup' ||
    page === 'setup-group-search' ||
    page === 'setup-ready' ||
    page === 'group-setup' ||
    page === 'group-setup-success';

  const activeBottomTab: NavTab = useMemo(() => {
    if (page === 'home') return 'home';
    if (page === 'schedule' || page === 'lesson-detail') return 'schedule';
    if (
      page === 'services' ||
      page === 'campus' ||
      page === 'directory' ||
      page === 'community' ||
      page === 'bells' ||
      page === 'search' ||
      page === 'teacher-schedule' ||
      page === 'grades'
    )
      return 'services';
    if (page === 'events' || page === 'event-detail') return 'events';
    // Profile owns 'profile', 'students' (Одногрупники), 'notifications', 'support'
    return 'profile';
  }, [page]);

  const handleSelectBottomTab = (navTab: NavTab) => {
    haptic('selection');
    if (navTab === 'home') navigateTo('home');
    else if (navTab === 'schedule') navigateTo('schedule');
    else if (navTab === 'services') navigateTo('services');
    else if (navTab === 'events') navigateTo('events');
    else if (navTab === 'profile') navigateTo('profile');
  };

  return (
    <div className={`stud-shell ${isOnboardingPage ? 'stud-shell--no-nav' : ''}`}>
      {/* Universal Top Header ("STUD IN / ТВІЙ СТУДЕНТСЬКИЙ ПРОСТІР" + Notification Bell) */}
      <TopHeader
        onBrandClick={() => {
          if (!isOnboardingPage) navigateTo('home');
        }}
        onBellClick={
          !isOnboardingPage
            ? () => {
                navigateTo('notifications');
              }
            : undefined
        }
      />

      {/* Smooth Page Transition Container */}
      <AnimatePresence mode="wait">
        <motion.main
          key={page}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          {/* ==================== ONBOARDING SCREENS (03, 09, 10) ==================== */}
          {(page === 'setup' || page === 'setup-group-search' || page === 'setup-ready') && (
            <SetupWizard
              step={page}
              setStep={(s) => navigateTo(s)}
              faculties={faculties}
              selectedFaculty={selectedFaculty}
              onFacultyChange={onFacultyChange}
              groups={groups}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              userName={userName}
              setUserName={setUserName}
              onFinish={onFinishSetup}
              onOpenHint={() => setIsHintModalOpen(true)}
            />
          )}

          {/* ==================== SCREEN 01 & 09 (DARK): ГОЛОВНА ==================== */}
          {page === 'home' && (
            <HomeView
              userName={userName}
              selectedGroup={selectedGroup}
              schedule={schedule}
              effectiveSubgroup={effectiveSubgroup}
              now={now}
              events={events}
              onNavigate={navigateTo}
              onSelectLesson={(lesson) => {
                setSelectedLesson(lesson);
                navigateTo('lesson-detail');
              }}
              onSelectEvent={(ev) => {
                setSelectedEvent(ev);
                navigateTo('event-detail');
              }}
            />
          )}

          {/* ==================== SCREEN 02 & STATES 01-04 & 10 (DARK): РОЗКЛАД ==================== */}
          {page === 'schedule' && (
            <ScheduleView
              schedule={schedule}
              loading={loading}
              error={scheduleError}
              isDemoData={isDemoData}
              tab={tab}
              setTab={(t) => {
                haptic('selection');
                setTab(t);
              }}
              now={now}
              effectiveSubgroup={effectiveSubgroup}
              selectedGroup={selectedGroup}
              faculties={faculties}
              onRetry={() => selectedGroup && fetchSchedule(selectedGroup.id)}
              onOpenStudents={() => navigateTo('students')}
              onSelectLesson={(lesson) => {
                setSelectedLesson(lesson);
                navigateTo('lesson-detail');
              }}
            />
          )}

          {/* ==================== SCREEN 11: ДЕТАЛІ ЗАНЯТТЯ ==================== */}
          {page === 'lesson-detail' && selectedLesson && (
            <LessonDetailView
              lesson={selectedLesson}
              selectedGroup={selectedGroup}
              onBack={() => navigateTo('schedule')}
              openLink={openLink}
            />
          )}

          {/* ==================== SCREEN 12: ОДНОГРУПНИКИ (у розділі Профіль) ==================== */}
          {page === 'students' && (
            <StudentsView
              students={students}
              selectedGroup={selectedGroup}
              matchedStudentIndex={matchedStudentIndex}
              userName={userName}
              onBack={() => navigateTo('profile')}
              openLink={openLink}
            />
          )}

          {/* ==================== SCREEN 04: СЕРВІСИ ==================== */}
          {page === 'services' && <ServicesView onNavigate={navigateTo} />}

          {/* ==================== СПІЛЬНОТА (Чати та студентська підтримка) ==================== */}
          {page === 'community' && (
            <CommunityView onBack={() => navigateTo('services')} openLink={openLink} />
          )}

          {/* ==================== SCREEN 07: КАМПУС ==================== */}
          {page === 'campus' && <CampusView onBack={() => navigateTo('services')} />}

          {/* ==================== SCREEN 08: ДОВІДНИК ==================== */}
          {page === 'directory' && (
            <DirectoryView onBack={() => navigateTo('services')} openLink={openLink} />
          )}

          {/* ==================== SCREEN 07 (STATES): РОЗКЛАД ДЗВІНКІВ ==================== */}
          {page === 'bells' && (
            <div>
              <button type="button" className="stud-back-link" onClick={() => navigateTo('services')}>
                ‹ До сервісів
              </button>
              <BellsView now={now} />
            </div>
          )}

          {/* ==================== SCREEN 05: ПОДІЇ ==================== */}
          {page === 'events' && (
            <EventsView
              events={events}
              loading={eventsLoading}
              onRefresh={loadLiveEvents}
              onSelectEvent={(ev) => {
                setSelectedEvent(ev);
                navigateTo('event-detail');
              }}
            />
          )}

          {/* ==================== SCREEN 05 (STATES): ДЕТАЛІ ПОДІЇ ==================== */}
          {page === 'event-detail' && (
            <EventDetailView
              event={selectedEvent}
              onBack={() => navigateTo('events')}
              openLink={openLink}
            />
          )}

          {/* ==================== SCREEN 06: ПРОФІЛЬ ==================== */}
          {page === 'profile' && (
            <ProfileView
              userName={userName}
              setUserName={setUserName}
              selectedFaculty={selectedFaculty}
              faculties={faculties}
              selectedGroup={selectedGroup}
              subgroupOverride={subgroupOverride}
              setSubgroupOverride={setSubgroupOverride}
              onNavigate={navigateTo}
              onChangeEducation={() => navigateTo('setup')}
              onSaveProfile={handleSaveProfileIdentity}
            />
          )}

          {/* ==================== SCREEN 08 (STATES): СПОВІЩЕННЯ ==================== */}
          {page === 'notifications' && (
            <div>
              <button type="button" className="stud-back-link" onClick={() => navigateTo('profile')}>
                ‹ До профілю
              </button>
              <NotificationsView
                notifyLessons={notify15Min}
                setNotifyLessons={setNotify15Min}
                remindMinutes={remindMinutes}
                setRemindMinutes={setRemindMinutes}
                notifyEvents={notifyChanges}
                setNotifyEvents={setNotifyChanges}
                onSave={async () => {
                  await savePreferences();
                  navigateTo('profile');
                }}
              />
            </div>
          )}

          {/* ==================== SCREEN 06 (STATES): ПІДТРИМКА · ДЕМО ==================== */}
          {page === 'support' && (
            <div>
              <button type="button" className="stud-back-link" onClick={() => navigateTo('profile')}>
                ‹ До профілю
              </button>
              <SupportView onBack={() => navigateTo('profile')} />
            </div>
          )}

          {/* ==================== НАВЧАЛЬНІ ІНСТРУМЕНТИ (Оцінки МІА, Викладачі, Пошук) ==================== */}
          {page === 'admin' && adminSecret && <AdminPanel secret={adminSecret} api={API} />}
          {page === 'grades' && (
            <div>
              <button type="button" className="stud-back-link" onClick={() => navigateTo('services')}>
                ‹ До сервісів
              </button>
              <GradesView />
            </div>
          )}
          {page === 'teacher-schedule' && (
            <div>
              <button type="button" className="stud-back-link" onClick={() => navigateTo('services')}>
                ‹ До сервісів
              </button>
              <TeacherSchedule />
            </div>
          )}
          {page === 'search' && (
            <div>
              <button type="button" className="stud-back-link" onClick={() => navigateTo('services')}>
                ‹ До сервісів
              </button>
              <SearchView />
            </div>
          )}

          {page === 'group-setup' && (
            <div className="main-card">
              <h2 className="stud-h1" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                Налаштування групи для чату
              </h2>
              <p className="stud-subtitle" style={{ marginBottom: '1.1rem' }}>
                Щоранку о 07:30 сюди надсилатиметься розклад ДТЕУ.
              </p>
              <div className="stud-form-group">
                <label className="stud-label">ФАКУЛЬТЕТ</label>
                <select
                  className="stud-select"
                  value={selectedFaculty}
                  onChange={(e) => onFacultyChange(e.target.value)}
                >
                  <option value="">Виберіть факультет</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              {courses.length > 0 && (
                <div className="stud-form-group">
                  <label className="stud-label">КУРС</label>
                  <select
                    className="stud-select"
                    value={selectedCourse}
                    onChange={(e) => onCourseChange(e.target.value)}
                  >
                    <option value="">Виберіть курс</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {groups.length > 0 && (
                <div className="stud-form-group">
                  <label className="stud-label">ГРУПА</label>
                  <select
                    className="stud-select"
                    value={selectedGroup?.id || ''}
                    onChange={(e) => {
                      const g = groups.find((x) => x.id === e.target.value);
                      if (g) setSelectedGroup(g);
                    }}
                  >
                    <option value="">Виберіть групу</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                className="stud-btn-primary"
                disabled={!selectedGroup}
                onClick={onSaveGroupSetup}
              >
                Зберегти налаштування →
              </button>
            </div>
          )}

          {page === 'group-setup-success' && (
            <div className="stud-state-card" style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <h2 className="stud-state-title">Готово!</h2>
              <p className="stud-state-desc" style={{ marginBottom: '1.5rem' }}>
                Розклад для цієї групи успішно збережено.
              </p>
              <button
                type="button"
                className="stud-btn-primary"
                onClick={() => window.Telegram?.WebApp?.close()}
              >
                Закрити вікно
              </button>
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {/* ==================== BOTTOM NAVIGATION BAR ==================== */}
      {!isOnboardingPage && (
        <BottomNav activeTab={activeBottomTab} onSelectTab={handleSelectBottomTab} />
      )}

      {/* ==================== HINT MODAL ==================== */}
      <Modal isOpen={isHintModalOpen} onClose={() => setIsHintModalOpen(false)}>
        <div style={{ padding: '1.35rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
            Навіщо вводити Прізвище та Ім’я?
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Твоє ім’я використовується для автоматичного визначення підгрупи за списком групи ДТЕУ та виділення позначкою <b>«Ви»</b> серед одногрупників.
          </p>
          <button
            type="button"
            className="stud-btn-primary"
            onClick={() => setIsHintModalOpen(false)}
          >
            Зрозуміло
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
