import React, { useState, useMemo } from 'react';
import type { Faculty, Group } from '../../types';
import { getFacultyShortName } from '../../utils/constants';

interface Props {
  step: 'setup' | 'setup-group-search' | 'setup-ready';
  setStep: (s: 'setup' | 'setup-group-search' | 'setup-ready') => void;
  faculties: Faculty[];
  selectedFaculty: string;
  onFacultyChange: (fid: string) => void;
  groups: Group[];
  selectedGroup: Group | null;
  setSelectedGroup: (g: Group | null) => void;
  userName: string;
  setUserName: (n: string) => void;
  onFinish: () => void;
  onOpenHint?: () => void;
}

export const SetupWizard: React.FC<Props> = ({
  step,
  setStep,
  faculties,
  selectedFaculty,
  onFacultyChange,
  groups,
  selectedGroup,
  setSelectedGroup,
  userName,
  setUserName,
  onFinish,
  onOpenHint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const currentFacultyObj = useMemo(
    () => faculties.find((f) => f.id === selectedFaculty) || null,
    [faculties, selectedFaculty]
  );

  const facultyShort = useMemo(
    () => (currentFacultyObj ? getFacultyShortName(currentFacultyObj.shortName || currentFacultyObj.name) : 'ФТМ'),
    [currentFacultyObj]
  );

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  // ==================== SCREEN 09: ВИБІР ГРУПИ (Search Screen) ====================
  if (step === 'setup-group-search') {
    const activeGroup =
      selectedGroup ||
      filteredGroups[0] || {
        id: 'demo-ftm-3-10',
        name: `${facultyShort} ${searchQuery.trim() || '3-10'}`,
        course: 3,
      };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="stud-page-header">
          <h1 className="stud-h1">Обери свою групу</h1>
          <div className="stud-subtitle-row">
            <span className="stud-subtitle">
              ДТЕУ · {currentFacultyObj?.name || 'Факультет торгівлі та маркетингу'}
            </span>
          </div>
        </div>

        <div className="stud-form-group">
          <input
            type="text"
            className="stud-input"
            placeholder="Наприклад: 3-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ marginTop: '0.35rem', marginBottom: '1.1rem' }}>
          <span className="stud-label" style={{ marginBottom: '0.55rem' }}>
            РЕЗУЛЬТАТ ПОШУКУ
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
            {(filteredGroups.length > 0 ? filteredGroups : [activeGroup]).map((g) => {
              const isSelected = selectedGroup?.id === g.id || (!selectedGroup && g.id === activeGroup.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroup(g)}
                  className="stud-list-card"
                  style={{
                    background: isSelected ? 'var(--bg-surface-alt)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'var(--border-strong)' : 'var(--border-color)',
                    borderWidth: isSelected ? '1.5px' : '1px',
                  }}
                >
                  <div className="stud-icon-box" style={{ background: 'transparent' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="stud-list-body">
                    <div className="stud-list-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      {g.name}
                    </div>
                    <div className="stud-list-sub">Академічна група</div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--accent-forest)',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Не знаходиш групу?
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Перевір факультет або зміни пошуковий запит.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Обери свою групу зі списку результатів.
          </p>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <button
            type="button"
            className="stud-btn-primary"
            onClick={() => {
              if (!selectedGroup) setSelectedGroup(activeGroup);
              setStep('setup-ready');
            }}
          >
            Обрати {(selectedGroup || activeGroup).name} →
          </button>
          <button
            type="button"
            onClick={() => setStep('setup')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.4rem',
              textAlign: 'center',
            }}
          >
            ‹ Повернутися до налаштування
          </button>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 10: ТВІЙ ПРОСТІР ГОТОВИЙ ====================
  if (step === 'setup-ready') {
    const shortGroup = selectedGroup?.name.replace(/^[А-ЯІЇЄҐA-Z]+\s+/i, '') || '3-10';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="stud-page-header">
          <h1 className="stud-h1">Твій простір готовий</h1>
          <div className="stud-subtitle-row">
            <span className="stud-subtitle">Перевір дані перед початком</span>
          </div>
        </div>

        <div className="stud-form-group">
          <label className="stud-label">УНІВЕРСИТЕТ</label>
          <select className="stud-select" value="dteu" disabled style={{ opacity: 1 }}>
            <option value="dteu">ДТЕУ</option>
          </select>
        </div>

        <div className="stud-form-group">
          <label className="stud-label">ПРІЗВИЩЕ ТА ІМ’Я</label>
          <input
            type="text"
            className="stud-input"
            placeholder="Введи прізвище та ім’я"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="stud-form-group">
          <label className="stud-label">ФАКУЛЬТЕТ</label>
          <select
            className="stud-select"
            value={selectedFaculty}
            onChange={(e) => {
              onFacultyChange(e.target.value);
              setStep('setup');
            }}
          >
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {getFacultyShortName(f.shortName || f.name)} — {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="stud-form-group">
          <label className="stud-label">АКАДЕМІЧНА ГРУПА</label>
          <button
            type="button"
            onClick={() => setStep('setup-group-search')}
            className="stud-select"
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>{shortGroup}</span>
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-surface-alt)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1rem 1.05rem',
            marginBottom: '1.25rem',
            marginTop: '0.25rem',
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Персональний розклад
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Підгрупа визначається за даними сервісу.
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button type="button" className="stud-btn-primary" onClick={onFinish}>
            Почати →
          </button>
          <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.65rem' }}>
            Налаштування профілю ДТЕУ
          </div>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 03: ПЕРШИЙ ЗАПУСК (Initial Setup) ====================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="stud-page-header">
        <h1 className="stud-h1" style={{ fontSize: '1.85rem' }}>
          Налаштуємо
          <br />
          твій простір
        </h1>
        <div className="stud-subtitle-row" style={{ marginTop: '0.45rem' }}>
          <span className="stud-subtitle">Обери групу — ми підберемо розклад.</span>
        </div>
      </div>

      <div className="stud-form-group">
        <label className="stud-label">УНІВЕРСИТЕТ</label>
        <select className="stud-select" value="dteu" disabled style={{ opacity: 1 }}>
          <option value="dteu">ДТЕУ</option>
        </select>
      </div>

      <div className="stud-form-group">
        <label className="stud-label">ПРІЗВИЩЕ ТА ІМ’Я</label>
        <input
          type="text"
          className="stud-input"
          placeholder="Введи прізвище та ім’я"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={40}
        />
      </div>

      <div className="stud-form-group">
        <label className="stud-label">ФАКУЛЬТЕТ</label>
        <select
          className="stud-select"
          value={selectedFaculty}
          onChange={(e) => onFacultyChange(e.target.value)}
        >
          <option value="">Обери факультет</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="stud-form-group">
        <label className="stud-label">АКАДЕМІЧНА ГРУПА</label>
        {!selectedFaculty ? (
          <select className="stud-select" disabled value="">
            <option value="">Спочатку обери факультет</option>
          </select>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <select
              className="stud-select"
              value={selectedGroup?.id || ''}
              onChange={(e) => {
                if (e.target.value === '__search__') {
                  setStep('setup-group-search');
                  return;
                }
                const g = groups.find((x) => x.id === e.target.value);
                if (g) setSelectedGroup(g);
              }}
            >
              <option value="">Обери академічну групу</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="__search__">🔍 Пошук групи за назвою...</option>
            </select>
            <button
              type="button"
              onClick={() => setStep('setup-group-search')}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Швидкий пошук групи →
            </button>
          </div>
        )}
      </div>

      <div
        onClick={onOpenHint}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
          margin: '0.4rem 0 1.4rem',
          cursor: onOpenHint ? 'pointer' : 'default',
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: '2px' }}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Ім’я потрібне для визначення підгрупи та позначки «Ви» серед одногрупників.
        </p>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          type="button"
          className="stud-btn-primary"
          disabled={!selectedGroup}
          onClick={() => setStep('setup-ready')}
        >
          Перейти до розкладу →
        </button>
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.65rem' }}>
          Налаштування можна змінити у профілі.
        </div>
      </div>
    </div>
  );
};
