import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { StudEvent } from '../../types';
import { fetchSingleEventDetails } from '../../utils/suteEvents';

// ==================== SCREEN 05: ПОДІЇ ====================
export const EventsView: React.FC<{
  events: StudEvent[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectEvent: (ev: StudEvent) => void;
}> = ({ events, loading = false, onRefresh, onSelectEvent }) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'study' | 'studlife'>('all');

  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'all') return events;
    if (categoryFilter === 'study') {
      return events.filter((e) => e.category === 'study');
    }
    // 'studlife' includes student life & student competitions/opportunities
    return events.filter((e) => e.category === 'studlife' || e.category === 'opportunities');
  }, [events, categoryFilter]);

  const featured = filteredEvents.find((e) => e.isFeatured) || filteredEvents[0];
  const restEvents = filteredEvents.filter((e) => e.id !== featured?.id);
  const hasLiveEvents = events.some((e) => e.isLive);

  return (
    <div className="stud-anim-in">
      <div className="stud-page-header">
        <h1 className="stud-h1">Події</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Життя університету — поруч</span>
          {onRefresh && (
            <button type="button" className="stud-inline-action" onClick={onRefresh}>
              {loading ? 'Оновлюємо...' : 'Оновити ↻'}
            </button>
          )}
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

      {loading && events.length === 0 ? (
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
      ) : (
        <>
          {/* Featured Event Dark Green Card */}
          {featured && (
            <motion.div
              whileTap={{ scale: 0.985 }}
              className="stud-hero-card"
              onClick={() => onSelectEvent(featured)}
              style={{ cursor: 'pointer', marginBottom: '0.9rem' }}
            >
              <div className="stud-hero-eyebrow">{featured.categoryBadge}</div>
              <div className="stud-hero-title stud-hero-title--lg" style={{ fontSize: '1.35rem', lineHeight: 1.25 }}>
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
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.45rem' }}>
                    {featured.isLive ? 'Офіційний анонс ДТЕУ · sute.edu.ua' : 'Демонстраційна подія'}
                  </div>
                </div>

                <span style={{ color: 'var(--accent-lime)', fontSize: '1.25rem', fontWeight: 700 }}>
                  →
                </span>
              </div>
            </motion.div>
          )}

          {/* Remaining Events List */}
          <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {restEvents.map((ev) => (
              <motion.button
                whileTap={{ scale: 0.985 }}
                key={ev.id}
                type="button"
                className="stud-list-card"
                onClick={() => onSelectEvent(ev)}
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.6rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div className="stud-date-badge">
                    <span className="stud-date-badge-day">{ev.dayNum}</span>
                    <span className="stud-date-badge-month">{ev.monthShort}</span>
                  </div>
                  <div className="stud-list-body">
                    <div className="stud-list-eyebrow">
                      {ev.categoryBadge}
                    </div>
                    <div className="stud-list-title" style={{ fontSize: '0.98rem', fontWeight: 800, lineHeight: 1.3 }}>
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
                    {ev.isLive ? 'Джерело: sute.edu.ua/events' : 'Демонстраційна подія'}
                  </span>
                  <span className="stud-list-arrow">→</span>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}

      <div className="stud-footnote">
        {hasLiveEvents
          ? 'Анонси синхронізовано з офіційним порталом ДТЕУ (sute.edu.ua/events).'
          : 'Дати й матеріали в макеті — для прикладу.'}
      </div>
    </div>
  );
};

// ==================== SCREEN 05 (STATES): ДЕТАЛІ ПОДІЇ ====================
export const EventDetailView: React.FC<{
  event: StudEvent;
  onBack: () => void;
  openLink?: (url: string) => void;
}> = ({ event, onBack, openLink }) => {
  const [detailedEvent, setDetailedEvent] = useState<StudEvent>(event);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    setDetailedEvent(event);
    if (event.uri && (!event.description || event.description === event.title)) {
      setLoadingDetails(true);
      fetchSingleEventDetails(event)
        .then((full) => setDetailedEvent(full))
        .finally(() => setLoadingDetails(false));
    }
  }, [event]);

  const handleOpenExternal = (url?: string) => {
    if (!url) return;
    if (openLink) openLink(url);
    else window.open(url, '_blank');
  };

  return (
    <div className="stud-anim-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button type="button" className="stud-back-link" onClick={onBack}>
        ‹ Назад до подій
      </button>

      {/* Dark Green Header Card */}
      <div className="stud-hero-card">
        <div className="stud-hero-eyebrow">
          {detailedEvent.isLive ? detailedEvent.categoryBadge : 'СТУДЖИТТЯ · ПРИКЛАД'}
        </div>
        <div className="stud-hero-title stud-hero-title--lg" style={{ fontSize: '1.45rem', marginBottom: '0.65rem', lineHeight: 1.25 }}>
          {detailedEvent.title}
        </div>
        <div className="stud-hero-meta" style={{ marginBottom: 0 }}>
          {detailedEvent.subtitle}
        </div>
      </div>

      {/* Date & Location Cards */}
      <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
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
            <div className="stud-list-title">{detailedEvent.dateLabel}</div>
            <div className="stud-list-sub">
              {loadingDetails ? 'Завантажуємо точний час...' : detailedEvent.timeInfo}
            </div>
          </div>
          <span className="stud-list-arrow">›</span>
        </div>

        <div
          className="stud-list-card"
          style={{ cursor: detailedEvent.actionUrl ? 'pointer' : 'default' }}
          onClick={() => detailedEvent.actionUrl && handleOpenExternal(detailedEvent.actionUrl)}
        >
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">{detailedEvent.locationTitle}</div>
            <div className="stud-list-sub">{detailedEvent.locationSub}</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </div>
      </div>

      {/* Про подію */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="stud-section-title" style={{ marginBottom: '0.5rem' }}>
          Про подію
        </h2>
        {loadingDetails ? (
          <div className="stud-skel-lines" style={{ marginBottom: '0.85rem' }}>
            <div className="stud-skel-line" style={{ width: '92%' }} />
            <div className="stud-skel-line" style={{ width: '85%' }} />
            <div className="stud-skel-line" style={{ width: '68%' }} />
          </div>
        ) : (
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              marginBottom: '0.85rem',
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
            }}
          >
            {detailedEvent.description}
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {detailedEvent.isLive
            ? 'Організатор і джерело: Офіційний портал ДТЕУ (sute.edu.ua)'
            : detailedEvent.organizerInfo || 'Організатор і джерело: ще не додано'}
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {detailedEvent.actionUrl && (
          <button
            type="button"
            className="stud-btn-primary"
            onClick={() => handleOpenExternal(detailedEvent.actionUrl)}
          >
            Приєднатися / Матеріали події ↗
          </button>
        )}

        {detailedEvent.sourceUrl ? (
          <button
            type="button"
            className={detailedEvent.actionUrl ? 'stud-btn-soft' : 'stud-btn-primary'}
            onClick={() => handleOpenExternal(detailedEvent.sourceUrl)}
          >
            Відкрити на sute.edu.ua ↗
          </button>
        ) : (
          <button type="button" className="stud-btn-soft" disabled style={{ opacity: 0.78, cursor: 'default' }}>
            Реєстрація ще не відкрита
          </button>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {detailedEvent.isLive ? 'Синхронізовано з adm.sute.edu.ua API' : 'Демонстраційна подія'}
        </div>
      </div>
    </div>
  );
};
