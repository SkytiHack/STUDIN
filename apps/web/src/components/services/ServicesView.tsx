import React, { useState } from 'react';
import type { Page } from '../../types';

// ==================== SCREEN 04: СЕРВІСИ ====================
export const ServicesView: React.FC<{
  onNavigate: (page: Page) => void;
}> = ({ onNavigate }) => {
  return (
    <div>
      <div className="stud-page-header">
        <h1 className="stud-h1">Сервіси</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Університет під рукою</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.35rem' }}>
        <button type="button" className="stud-list-card" onClick={() => onNavigate('campus')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Кампус</div>
            <div className="stud-list-sub">Корпуси, адреси та навігація</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </button>

        <button type="button" className="stud-list-card" onClick={() => onNavigate('directory')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Довідник</div>
            <div className="stud-list-sub">Контакти й університетські служби</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </button>

        <button type="button" className="stud-list-card" onClick={() => onNavigate('bells')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Розклад дзвінків</div>
            <div className="stud-list-sub">Час пар і перерв</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </button>

        <button type="button" className="stud-list-card" onClick={() => onNavigate('students')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Спільнота</div>
            <div className="stud-list-sub">Чати та студентська підтримка</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </button>
      </div>

      {/* Незабаром */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Незабаром</h2>
      </div>

      <div
        style={{
          background: 'var(--bg-surface-soft)',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '1.15rem 1.15rem',
        }}
      >
        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          Більше можливостей для студентів
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.7rem' }}>
          Вакансії, стажування та гранти з’являться в наступних версіях.
        </p>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Стеж за оновленнями STUD IN
        </span>
      </div>
    </div>
  );
};

// ==================== SCREEN 07: КАМПУС · БЕЗ ДАНИХ ====================
export const CampusView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [query, setQuery] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="stud-page-header">
        <h1 className="stud-h1">Кампус</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Знайди свій корпус</span>
        </div>
      </div>

      <div className="stud-form-group" style={{ marginBottom: '0.9rem' }}>
        <input
          type="text"
          className="stud-input"
          placeholder="Пошук за назвою корпусу"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="stud-state-card stud-state-card--soft">
        <div className="stud-state-icon" style={{ background: 'transparent', marginBottom: '0.5rem' }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="stud-state-title" style={{ fontSize: '1.05rem' }}>
          Збираємо перевірені адреси
        </div>
        <p className="stud-state-desc">
          Тут будуть корпуси, входи та переходи до зовнішніх карт.
        </p>
      </div>

      <div
        className="stud-list-card"
        style={{
          cursor: 'default',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.3rem',
          marginBottom: '1.1rem',
        }}
      >
        <div className="stud-list-title" style={{ fontSize: '0.92rem' }}>
          Без помилкових маршрутів
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Адреси та входи додамо після перевірки.
          <br />
          Інтерактивний план — у наступній версії.
        </p>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-soft" onClick={onBack}>
          Повернутися до сервісів
        </button>
      </div>
    </div>
  );
};

// ==================== SCREEN 08: ДОВІДНИК · БЕЗ ДАНИХ ====================
export const DirectoryView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'contacts' | 'links'>('all');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="stud-page-header">
        <h1 className="stud-h1">Довідник</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Контакти, служби, корисні посилання</span>
        </div>
      </div>

      <div className="stud-form-group" style={{ marginBottom: '0.8rem' }}>
        <input
          type="text"
          className="stud-input"
          placeholder="Пошук у довіднику"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="stud-filter-pills">
        <button
          type="button"
          className={`stud-filter-pill ${filter === 'all' ? 'stud-filter-pill--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Усе
        </button>
        <button
          type="button"
          className={`stud-filter-pill ${filter === 'contacts' ? 'stud-filter-pill--active' : ''}`}
          onClick={() => setFilter('contacts')}
        >
          Контакти
        </button>
        <button
          type="button"
          className={`stud-filter-pill ${filter === 'links' ? 'stud-filter-pill--active' : ''}`}
          onClick={() => setFilter('links')}
        >
          Посилання
        </button>
      </div>

      <div className="stud-state-card" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="stud-state-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
        <div className="stud-state-title">Довідник наповнюється</div>
        <p className="stud-state-desc">
          Додаємо перевірені контакти деканатів, бібліотеки та студентських служб.
        </p>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.9rem' }}>
          Контакти з’являться тут після перевірки.
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-soft" onClick={onBack}>
          Повернутися до сервісів
        </button>
      </div>
    </div>
  );
};
