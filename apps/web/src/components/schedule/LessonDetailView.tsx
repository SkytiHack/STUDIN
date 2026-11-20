import React from 'react';
import type { Group, ScheduleItem } from '../../types';
import { typeLabel } from '../../utils/constants';

interface Props {
  lesson: ScheduleItem;
  selectedGroup: Group | null;
  onBack: () => void;
  openLink: (url: string) => void;
}

export const LessonDetailView: React.FC<Props> = ({
  lesson,
  selectedGroup,
  onBack,
  openLink,
}) => {
  const formattedDate = (() => {
    const d = new Date(lesson.date);
    if (isNaN(d.getTime())) return lesson.date;
    const str = d.toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  })();

  const isOnline =
    !lesson.classroom ||
    lesson.classroom.toLowerCase().includes('онлайн') ||
    lesson.classroom.toLowerCase().includes('дист');

  // Extract optional meeting URL from annotation if present
  const meetingUrl = (() => {
    if (!lesson.annotation) return null;
    const match = lesson.annotation.match(/https?:\/\/[^\s"'<>]+/i);
    return match ? match[0] : null;
  })();

  const handleTeacherSearch = () => {
    if (!lesson.teacher) return;
    openLink(`https://www.google.com/search?q=site:knute.edu.ua+"${encodeURIComponent(lesson.teacher)}"`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button type="button" className="stud-back-link" onClick={onBack}>
        ‹ До розкладу
      </button>

      {/* Dark Green Lesson Header Card */}
      <div className="stud-hero-card">
        <div className="stud-hero-eyebrow">
          {lesson.lessonNumber} ПАРА · {typeLabel(lesson.type).toUpperCase()}
        </div>
        <div className="stud-hero-title stud-hero-title--lg">{lesson.subject}</div>
        <div className="stud-hero-meta" style={{ marginBottom: '0.6rem' }}>
          {formattedDate}
        </div>
        <div className="stud-hero-time" style={{ marginBottom: 0 }}>
          <span className="stud-hero-time-start" style={{ fontSize: '1.65rem' }}>
            {lesson.startTime} — {lesson.endTime}
          </span>
        </div>
      </div>

      {/* Info Cards Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.1rem' }}>
        <button
          type="button"
          className="stud-list-card"
          onClick={handleTeacherSearch}
        >
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Викладач</div>
            <div className="stud-list-sub">
              {lesson.teacher || 'Викладач не вказаний'}
            </div>
          </div>
          <span className="stud-list-arrow">›</span>
        </button>

        <button
          type="button"
          className="stud-list-card"
          onClick={() => {
            if (meetingUrl) openLink(meetingUrl);
          }}
        >
          <span className="stud-icon-box">
            {isOnline ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            )}
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">
              {isOnline ? 'Онлайн заняття' : `Аудиторія ${lesson.classroom}`}
            </div>
            <div className="stud-list-sub">
              {meetingUrl
                ? 'Натисни, щоб приєднатися до зустрічі'
                : isOnline
                ? 'Посилання ще не додано'
                : 'Кампус ДТЕУ'}
            </div>
          </div>
          <span className="stud-list-arrow">›</span>
        </button>

        <div
          className="stud-list-card"
          style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
        >
          <div className="stud-list-title">Моя група</div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Дані з розкладу університету.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        {meetingUrl ? (
          <button
            type="button"
            className="stud-btn-primary"
            onClick={() => openLink(meetingUrl)}
          >
            Приєднатися до заняття →
          </button>
        ) : (
          <button type="button" className="stud-btn-soft" disabled style={{ opacity: 0.75, cursor: 'default' }}>
            Посилання на заняття відсутнє
          </button>
        )}
      </div>
    </div>
  );
};
