import React, { useState, useMemo } from 'react';
import type { StudEvent } from '../../types';

// ==================== SCREEN 05: ПОДІЇ ====================
export const EventsView: React.FC<{
  events: StudEvent[];
  onSelectEvent: (ev: StudEvent) => void;
}> = ({ events, onSelectEvent }) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'study' | 'studlife'>('all');

  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'all') return events;
    return events.filter((e) => e.category === categoryFilter);
  }, [events, categoryFilter]);

  const featured = filteredEvents.find((e) => e.isFeatured) || filteredEvents[0];
  const restEvents = filteredEvents.filter((e) => e.id !== featured?.id);

  return (
    <div>
      <div className="stud-page-header">
        <h1 className="stud-h1">Події</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Життя університету — поруч</span>
        </div>
      </div>

      {/* Category Filter Pills: Усі / Навчання / Студжиття */}
      <div className="stud-filter-pills">
        <button
          type="button"
          className={`stud-filter-pill ${categoryFilter === 'all' ? 'stud-filter-pill--active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          Усі
        </button>
        <button
          type="button"
          className={`stud-filter-pill ${categoryFilter === 'study' ? 'stud-filter-pill--active' : ''}`}
          onClick={() => setCategoryFilter('study')}
        >
          Навчання
        </button>
        <button
          type="button"
          className={`stud-filter-pill ${categoryFilter === 'studlife' ? 'stud-filter-pill--active' : ''}`}
          onClick={() => setCategoryFilter('studlife')}
        >
          Студжиття
        </button>
      </div>

      {/* Featured Event Dark Green Card */}
      {featured && (
        <div
          className="stud-hero-card"
          onClick={() => onSelectEvent(featured)}
          style={{ cursor: 'pointer', marginBottom: '0.9rem' }}
        >
          <div className="stud-hero-eyebrow">{featured.categoryBadge}</div>
          <div className="stud-hero-title stud-hero-title--lg" style={{ fontSize: '1.45rem' }}>
            {featured.title}
          </div>
          <div className="stud-hero-meta" style={{ marginBottom: '1rem' }}>
            {featured.subtitle}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  background: 'var(--accent-lime)',
                  color: '#0D291E',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                {featured.dateLabel}
              </span>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.45rem' }}>
                Демонстраційна подія
              </div>
            </div>

            <span style={{ color: 'var(--accent-lime)', fontSize: '1.25rem', fontWeight: 700 }}>
              →
            </span>
          </div>
        </div>
      )}

      {/* Remaining Events List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {restEvents.map((ev) => (
          <button
            key={ev.id}
            type="button"
            className="stud-list-card"
            onClick={() => onSelectEvent(ev)}
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.6rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="stud-date-badge">
                <span className="stud-date-badge-day">{ev.dayNum}</span>
                <span className="stud-date-badge-month">{ev.monthShort}</span>
              </div>
              <div className="stud-list-body">
                <div className="stud-list-eyebrow" style={{ color: '#0D3B28' }}>
                  {ev.categoryBadge}
                </div>
                <div className="stud-list-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  {ev.title}
                </div>
                <div className="stud-list-sub">{ev.subtitle}</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingTop: '0.15rem',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Демонстраційна подія
              </span>
              <span className="stud-list-arrow">→</span>
            </div>
          </button>
        ))}
      </div>

      <div className="stud-footnote">Дати й матеріали в макеті — для прикладу.</div>
    </div>
  );
};

// ==================== SCREEN 05 (STATES): ДЕТАЛІ ПОДІЇ ====================
export const EventDetailView: React.FC<{
  event: StudEvent;
  onBack: () => void;
}> = ({ event, onBack }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button type="button" className="stud-back-link" onClick={onBack}>
        ‹ Назад до подій
      </button>

      {/* Dark Green Header Card */}
      <div className="stud-hero-card">
        <div className="stud-hero-eyebrow">СТУДЖИТТЯ · ПРИКЛАД</div>
        <div className="stud-hero-title stud-hero-title--lg" style={{ fontSize: '1.65rem', marginBottom: '0.75rem' }}>
          {event.title}
        </div>
        <div className="stud-hero-meta" style={{ marginBottom: 0 }}>
          {event.subtitle}
        </div>
      </div>

      {/* Date & Location Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
        <div className="stud-list-card" style={{ cursor: 'default' }}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">{event.dateLabel}</div>
            <div className="stud-list-sub">{event.timeInfo}</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </div>

        <div className="stud-list-card" style={{ cursor: 'default' }}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">{event.locationTitle}</div>
            <div className="stud-list-sub">{event.locationSub}</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </div>
      </div>

      {/* Про подію */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="stud-section-title" style={{ marginBottom: '0.5rem' }}>
          Про подію
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
          {event.description}
        </p>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {event.organizerInfo}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-soft" disabled style={{ opacity: 0.78, cursor: 'default' }}>
          Реєстрація ще не відкрита
        </button>
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Демонстраційна подія
        </div>
      </div>
    </div>
  );
};
