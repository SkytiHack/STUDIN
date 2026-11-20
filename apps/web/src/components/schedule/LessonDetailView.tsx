import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Group, ScheduleItem } from '../../types';
import { typeLabel } from '../../utils/constants';
import { Modal } from '../common/Modal';

interface Props {
  lesson: ScheduleItem;
  selectedGroup: Group | null;
  onBack: () => void;
  openLink: (url: string) => void;
}

function getAudienceMapInfo(classroom: string) {
  const lower = classroom.toLowerCase();
  if (lower.includes('онлайн') || lower.includes('дист') || lower.includes('teams') || lower.includes('zoom')) {
    return null;
  }

  const match = classroom.match(/([А-ЯІЄЇҐa-zA-Z])\s*[-–]?\s*(\d{1,4})/i);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const room = match[2];
  const floor = room.length >= 3 ? `${room.charAt(0)}-й поверх` : '';

  const queries: Record<string, string> = {
    'А': 'Державний торговельно-економічний університет, вулиця Кіото, 19, Київ',
    'Б': 'Бібліотека КНТЕУ, вулиця Кіото, 19, Київ',
    'В': 'вулиця Кіото, 19, Київ',
    'Г': 'вулиця Мілютенка, 8, Київ',
    'Д': 'вулиця Кіото, 21, Київ',
    'Л': 'вулиця Кіото, 23, Київ',
  };

  return {
    title: `Аудиторія ${letter}-${room}`,
    building: `Корпус ${letter}${floor ? ` · ${floor}` : ''}`,
    query: queries[letter] || 'Державний торговельно-економічний університет, Київ',
  };
}

export const LessonDetailView: React.FC<Props> = ({
  lesson,
  selectedGroup,
  onBack,
  openLink,
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);

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

  const mapInfo = lesson.classroom ? getAudienceMapInfo(lesson.classroom) : null;

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
    <div className="stud-anim-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
      <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.1rem' }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
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
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          className="stud-list-card"
          onClick={() => {
            if (meetingUrl) openLink(meetingUrl);
            else if (mapInfo) setIsMapOpen(true);
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
                : mapInfo
                ? `${mapInfo.building} · Натисни для карти`
                : 'Кампус ДТЕУ'}
            </div>
          </div>
          <span className="stud-list-arrow">›</span>
        </motion.button>

        {lesson.annotation && (
          <div
            className="stud-list-card"
            style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}
          >
            <div className="stud-list-title">Примітка до заняття</div>
            <div
              style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: lesson.annotation }}
            />
          </div>
        )}

        <div
          className="stud-list-card"
          style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
        >
          <div className="stud-list-title">Моя група</div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Дані для прикладу з наявного сервісу.
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
        ) : mapInfo ? (
          <button
            type="button"
            className="stud-btn-primary"
            onClick={() => setIsMapOpen(true)}
          >
            Показати корпус на карті →
          </button>
        ) : (
          <button type="button" className="stud-btn-soft" disabled style={{ opacity: 0.75, cursor: 'default' }}>
            Посилання на заняття відсутнє
          </button>
        )}
      </div>

      {mapInfo && isMapOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsMapOpen(false)}
          cardStyle={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', height: '380px', position: 'relative', overflow: 'hidden', background: '#e5e3df' }}>
              <iframe
                title={mapInfo.title}
                width="100%"
                height="520"
                style={{ border: 0, display: 'block', position: 'absolute', top: '-70px', left: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapInfo.query)}&t=k&z=18&output=embed`}
              />
            </div>
            <div style={{ padding: '1.15rem 1.25rem', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {mapInfo.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '0.9rem' }}>
                {mapInfo.building} · ДТЕУ
              </div>
              <button
                type="button"
                className="stud-btn-primary"
                onClick={() => setIsMapOpen(false)}
              >
                Закрити карту
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
