import React, { useState } from 'react';
import type { Faculty, Group, Page } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { getFacultyShortName } from '../../utils/constants';
import { Modal } from '../common/Modal';

// ==================== SCREEN 06: МІЙ ПРОФІЛЬ ====================
export const ProfileView: React.FC<{
  userName: string;
  setUserName: (name: string) => void;
  selectedFaculty: string;
  faculties: Faculty[];
  selectedGroup: Group | null;
  subgroupOverride: number;
  setSubgroupOverride: (sub: number) => void;
  onNavigate: (page: Page) => void;
  onChangeEducation: () => void;
  onSaveProfile: (newName: string, newSub: number) => void;
}> = ({
  userName,
  selectedFaculty,
  faculties,
  selectedGroup,
  subgroupOverride,
  onNavigate,
  onChangeEducation,
  onSaveProfile,
}) => {
  const { theme, setTheme } = useTheme();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [tempSubgroup, setTempSubgroup] = useState(subgroupOverride);

  const facultyObj = faculties.find((f) => f.id === selectedFaculty);
  const facultyShort = facultyObj
    ? getFacultyShortName(facultyObj.shortName || facultyObj.name)
    : selectedGroup?.name.split(' ')[0] || 'ФТМ';

  const groupNumberOnly = selectedGroup?.name.replace(/^[А-ЯІЇЄҐA-Z]+\s+/i, '') || '3-10';

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const themeLabel =
    theme === 'light' ? 'Світла · UA' : theme === 'dark' ? 'Темна · UA' : 'Системна · UA';

  return (
    <div>
      <div className="stud-page-header">
        <h1 className="stud-h1">Мій профіль</h1>
      </div>

      {/* Dark Green User Banner Card */}
      <div
        className="stud-hero-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.9rem',
          padding: '1.1rem 1.15rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--accent-lime)',
            color: '#0D291E',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.25 }}>
            {userName.trim() || 'Студент STUD IN'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.78)', marginTop: '0.18rem' }}>
            ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}
          </div>
        </div>
      </div>

      {/* Навчання Section */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Навчання</h2>
      </div>

      <div className="stud-group-box">
        <button type="button" className="stud-group-row" onClick={onChangeEducation}>
          <div className="stud-group-row-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
            </svg>
            <span className="stud-group-row-title">Університет</span>
          </div>
          <div className="stud-group-row-right">
            <span>ДТЕУ</span>
            <span>›</span>
          </div>
        </button>

        <button type="button" className="stud-group-row" onClick={onChangeEducation}>
          <div className="stud-group-row-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <span className="stud-group-row-title">Факультет</span>
          </div>
          <div className="stud-group-row-right">
            <span>{facultyShort}</span>
            <span>›</span>
          </div>
        </button>

        <button type="button" className="stud-group-row" onClick={onChangeEducation}>
          <div className="stud-group-row-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="stud-group-row-title">Академічна група</span>
          </div>
          <div className="stud-group-row-right">
            <span>{groupNumberOnly}</span>
            <span>›</span>
          </div>
        </button>

        <button
          type="button"
          className="stud-group-row"
          onClick={() => {
            setTempName(userName);
            setTempSubgroup(subgroupOverride);
            setIsEditModalOpen(true);
          }}
        >
          <div className="stud-group-row-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="stud-group-row-title">Ім’я та підгрупа</span>
          </div>
          <div className="stud-group-row-right">
            <span>Змінити</span>
            <span>›</span>
          </div>
        </button>
      </div>

      {/* Налаштування Section */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Налаштування</h2>
      </div>

      <div className="stud-group-box">
        <button type="button" className="stud-group-row" onClick={() => onNavigate('notifications')}>
          <div className="stud-group-row-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="stud-group-row-title">Сповіщення</span>
          </div>
          <div className="stud-group-row-right">
            <span>Налаштувати</span>
            <span>›</span>
          </div>
        </button>

        <button type="button" className="stud-group-row" onClick={cycleTheme}>
          <div className="stud-group-row-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="1.8" />
              <rect x="14" y="14" width="7" height="7" rx="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="1.8" />
            </svg>
            <span className="stud-group-row-title">Тема і мова</span>
          </div>
          <div className="stud-group-row-right">
            <span>{themeLabel}</span>
            <span>›</span>
          </div>
        </button>
      </div>

      {/* Підтримати STUD IN ♡ */}
      <button
        type="button"
        className="stud-btn-soft"
        onClick={() => onNavigate('support')}
        style={{ marginTop: '0.2rem' }}
      >
        <span>Підтримати STUD IN</span>
        <span>♡</span>
      </button>

      {/* Edit Name & Subgroup Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <div style={{ padding: '1.35rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Ім’я та підгрупа
          </h3>

          <div className="stud-form-group">
            <label className="stud-label">ПРІЗВИЩЕ ТА ІМ’Я</label>
            <input
              type="text"
              className="stud-input"
              placeholder="Наприклад: Тестовий Студент"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
            />
          </div>

          <div className="stud-form-group">
            <label className="stud-label">ПІДГРУПА</label>
            <select
              className="stud-select"
              value={tempSubgroup}
              onChange={(e) => setTempSubgroup(parseInt(e.target.value, 10))}
            >
              <option value={0}>Автоматично (за списком групи)</option>
              <option value={1}>1 підгрупа</option>
              <option value={2}>2 підгрупа</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="stud-btn-soft"
              onClick={() => setIsEditModalOpen(false)}
            >
              Скасувати
            </button>
            <button
              type="button"
              className="stud-btn-primary"
              onClick={() => {
                onSaveProfile(tempName, tempSubgroup);
                setIsEditModalOpen(false);
              }}
            >
              Зберегти
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==================== SCREEN 08 (STATES): СПОВІЩЕННЯ ====================
export const NotificationsView: React.FC<{
  notifyLessons: boolean;
  setNotifyLessons: (v: boolean) => void;
  remindMinutes: number;
  setRemindMinutes: (m: number) => void;
  notifyEvents: boolean;
  setNotifyEvents: (v: boolean) => void;
  onSave: () => void;
}> = ({
  notifyLessons,
  setNotifyLessons,
  remindMinutes,
  setRemindMinutes,
  notifyEvents,
  setNotifyEvents,
  onSave,
}) => {
  const cycleRemindMinutes = () => {
    const options = [5, 10, 15, 30];
    const nextIdx = (options.indexOf(remindMinutes) + 1) % options.length;
    setRemindMinutes(options[nextIdx]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="stud-page-header">
        <h1 className="stud-h1">Сповіщення</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Обирай, про що нагадувати</span>
        </div>
      </div>

      {/* Lesson Reminders Card */}
      <div className="stud-group-box" style={{ marginBottom: '0.85rem' }}>
        <div
          className="stud-group-row"
          style={{ cursor: 'default', paddingTop: '1.05rem', paddingBottom: '1.05rem' }}
        >
          <div style={{ flex: 1, paddingRight: '0.75rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Нагадування про пари
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Не пропускай початок заняття
            </div>
          </div>
          <label className="stud-switch">
            <input
              type="checkbox"
              checked={notifyLessons}
              onChange={(e) => setNotifyLessons(e.target.checked)}
            />
            <span className="stud-switch-slider" />
          </label>
        </div>

        <button
          type="button"
          className="stud-group-row"
          onClick={cycleRemindMinutes}
        >
          <span className="stud-group-row-title" style={{ fontSize: '0.86rem' }}>
            За скільки нагадати
          </span>
          <div className="stud-group-row-right">
            <span>{remindMinutes} хв</span>
            <span>›</span>
          </div>
        </button>
      </div>

      {/* Events & Opportunities Card */}
      <div className="stud-group-box" style={{ marginBottom: '0.85rem' }}>
        <div
          className="stud-group-row"
          style={{ cursor: 'default', paddingTop: '1.05rem', paddingBottom: '1.05rem' }}
        >
          <div style={{ flex: 1, paddingRight: '0.75rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Події та можливості
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Нові заходи й дедлайни
            </div>
          </div>
          <label className="stud-switch">
            <input
              type="checkbox"
              checked={notifyEvents}
              onChange={(e) => setNotifyEvents(e.target.checked)}
            />
            <span className="stud-switch-slider" />
          </label>
        </div>
      </div>

      {/* Info Box */}
      <div
        style={{
          background: 'var(--bg-surface-soft)',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '1.1rem 1.15rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
          Керування у твоїх руках
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Можна змінити вибір у будь-який момент.
          <br />
          Приклад налаштувань для прототипу.
        </p>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-primary" onClick={onSave}>
          Зберегти налаштування
        </button>
      </div>
    </div>
  );
};

// ==================== SCREEN 06 (STATES): ПІДТРИМКА · ДЕМО ====================
export const SupportView: React.FC<{
  onBack: () => void;
}> = () => {
  const [amount, setAmount] = useState<number>(50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="stud-page-header">
        <h1 className="stud-h1">Підтримати STUD IN</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Разом розвиваємо студентські сервіси</span>
        </div>
      </div>

      {/* Dark Green Value Card */}
      <div className="stud-hero-card">
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.45rem' }}>
          Твій внесок має значення
        </div>
        <p style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.82)', lineHeight: 1.45, marginBottom: '0.9rem' }}>
          Допомога на сервери, стабільну роботу та розвиток нових можливостей.
        </p>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-lime)' }}>
          Добровільно · Без обмежень доступу
        </div>
      </div>

      {/* Amount Choice */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Обери суму</h2>
      </div>

      <div className="stud-donate-amounts">
        {[25, 50, 100].map((val) => (
          <button
            key={val}
            type="button"
            className={`stud-donate-chip ${amount === val ? 'stud-donate-chip--active' : ''}`}
            onClick={() => setAmount(val)}
          >
            {val} ₴
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.35rem' }}>
        <button type="button" className="stud-btn-soft" style={{ opacity: 0.85 }}>
          Підтримати {amount} ₴
        </button>
        <button type="button" className="stud-btn-soft">
          ★ Telegram Stars
        </button>
      </div>

      {/* Transparency note */}
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Прозорість для спільноти
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Тут буде посилання на звіти про витрати.
        </p>
      </div>

      <div className="stud-footnote" style={{ marginTop: '1rem' }}>
        Демонстрація · Приймання платежів вимкнено
      </div>
    </div>
  );
};
