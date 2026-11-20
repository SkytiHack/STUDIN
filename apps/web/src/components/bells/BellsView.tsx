import React, { useState, useMemo } from 'react';
import { BELL_SCHEDULE, getNowTimeString } from '../../utils/constants';

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const BellsView: React.FC<{ now: Date }> = ({ now }) => {
  const [showAll, setShowAll] = useState(false);
  const nowStr = getNowTimeString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const visibleBells = showAll ? BELL_SCHEDULE : BELL_SCHEDULE.slice(0, 4);

  // Live bell status (active lesson or active break between lessons)
  const liveStatus = useMemo(() => {
    for (let i = 0; i < BELL_SCHEDULE.length; i++) {
      const b = BELL_SCHEDULE[i];
      const startM = toMin(b.start);
      const endM = toMin(b.end);

      if (nowMinutes >= startM && nowMinutes <= endM) {
        const left = endM - nowMinutes;
        const total = Math.max(1, endM - startM);
        const percent = Math.min(100, Math.round(((nowMinutes - startM) / total) * 100));
        return {
          title: `Зараз іде ${b.n} пара (${b.start}–${b.end})`,
          subtitle: `До дзвінка на перерву залишилось ${left} хв`,
          percent,
          activeLesson: b.n,
          activeBreakAfter: -1,
        };
      }

      const nextB = BELL_SCHEDULE[i + 1];
      if (nextB) {
        const nextStartM = toMin(nextB.start);
        if (nowMinutes > endM && nowMinutes < nextStartM) {
          const left = nextStartM - nowMinutes;
          const totalBreak = Math.max(1, nextStartM - endM);
          const percent = Math.min(100, Math.round(((nowMinutes - endM) / totalBreak) * 100));
          return {
            title: `Зараз перерва перед ${nextB.n} парою`,
            subtitle: `До початку ${nextB.n} пари (${nextB.start}) залишилось ${left} хв`,
            percent,
            activeLesson: -1,
            activeBreakAfter: b.n,
          };
        }
      }
    }

    const firstStartM = toMin(BELL_SCHEDULE[0].start);
    if (nowMinutes < firstStartM) {
      const diff = firstStartM - nowMinutes;
      return {
        title: 'Пари ще не розпочалися',
        subtitle:
          diff <= 120
            ? `До початку 1 пари (08:20) залишилось ${diff} хв`
            : 'Перша пара починається о 08:20',
        percent: null,
        activeLesson: -1,
        activeBreakAfter: -1,
      };
    }

    return {
      title: 'Навчальний день завершено',
      subtitle: 'Перша пара завтра о 08:20 · Гарного відпочинку!',
      percent: null,
      activeLesson: -1,
      activeBreakAfter: -1,
    };
  }, [nowMinutes]);

  return (
    <div className="stud-anim-in">
      <div className="stud-page-header">
        <h1 className="stud-h1">Розклад дзвінків</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Час пар та перерв · ДТЕУ</span>
        </div>
      </div>

      {/* Dark Green Banner Card with Live Bell Timer */}
      <div className="stud-hero-card" style={{ padding: '1.1rem 1.2rem', marginBottom: '1rem' }}>
        <div className="stud-hero-eyebrow">ЖИВИЙ ТАЙМЕР ДЗВІНКІВ</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.2rem' }}>
          {liveStatus.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.82)' }}>
          {liveStatus.subtitle}
        </div>

        {liveStatus.percent !== null && (
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.16)',
              overflow: 'hidden',
              marginTop: '0.75rem',
            }}
          >
            <div
              style={{
                width: `${liveStatus.percent}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'var(--accent-lime)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* Bell list with break intervals */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visibleBells.map((b, idx) => {
          const isActive = nowStr >= b.start && nowStr <= b.end;
          const isBreakActive = liveStatus.activeBreakAfter === b.n;
          const isLast = idx === visibleBells.length - 1;

          return (
            <React.Fragment key={b.n}>
              <div className={`stud-bell-item ${isActive ? 'stud-bell-item--active' : ''}`}>
                <div
                  className="stud-bell-num"
                  style={
                    isActive
                      ? { background: 'var(--accent-lime)', color: '#0D291E' }
                      : undefined
                  }
                >
                  {b.n}
                </div>
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
                <div
                  className="stud-bell-break"
                  style={
                    isBreakActive
                      ? { color: 'var(--accent-forest-text)', fontWeight: 800 }
                      : undefined
                  }
                >
                  {isBreakActive ? `⏱ Зараз перерва · ${b.breakAfter} хв` : `Перерва · ${b.breakAfter} хв`}
                </div>
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
        <div>Перші чотири пари наведено за стандартним розкладом ДТЕУ.</div>
      </div>
    </div>
  );
};
