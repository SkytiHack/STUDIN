import React, { useState } from 'react';
import { BELL_SCHEDULE, getNowTimeString } from '../../utils/constants';

export const BellsView: React.FC<{ now: Date }> = ({ now }) => {
  const [showAll, setShowAll] = useState(false);
  const nowStr = getNowTimeString(now);

  const visibleBells = showAll ? BELL_SCHEDULE : BELL_SCHEDULE.slice(0, 4);

  return (
    <div>
      <div className="stud-page-header">
        <h1 className="stud-h1">Розклад дзвінків</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Час пар та перерв · ДТЕУ</span>
        </div>
      </div>

      {/* Dark Green Banner Card */}
      <div className="stud-hero-card" style={{ padding: '1.1rem 1.2rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.2rem' }}>
          Плануй день зручно
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.78)' }}>
          Початок і завершення кожної пари
        </div>
      </div>

      {/* Bell list with break intervals */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visibleBells.map((b, idx) => {
          const isActive = nowStr >= b.start && nowStr <= b.end;
          const isLast = idx === visibleBells.length - 1;

          return (
            <React.Fragment key={b.n}>
              <div className={`stud-bell-item ${isActive ? 'stud-bell-item--active' : ''}`}>
                <div className="stud-bell-num">{b.n}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {b.n} пара
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {b.start} — {b.end}
                  </div>
                </div>
                {isActive && (
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      background: 'var(--accent-lime)',
                      color: '#0D291E',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    Зараз
                  </span>
                )}
              </div>

              {!isLast && b.breakAfter > 0 && (
                <div className="stud-bell-break">Перерва · {b.breakAfter} хв</div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {BELL_SCHEDULE.length > 4 && (
        <button
          type="button"
          className="stud-more-lessons-btn"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Показати перші 4 пари ↑' : 'Показати всі 6 пар ↓'}
        </button>
      )}

      <div className="stud-footnote">
        <div>Перші чотири пари наведено для прикладу.</div>
        <div style={{ marginTop: '0.2rem' }}>Повний перелік — після звірки з джерелом.</div>
      </div>
    </div>
  );
};
