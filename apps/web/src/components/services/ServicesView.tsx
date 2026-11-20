import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Page } from '../../types';
import { Modal } from '../common/Modal';

export interface CampusBuilding {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  address: string;
  mapQuery: string;
  details: string;
}

export const DTEU_BUILDINGS: CampusBuilding[] = [
  {
    id: 'b-a',
    code: 'А',
    title: 'Головний корпус А',
    subtitle: 'Ректорат, ФТМ, ФЕМП, ФМТП, актова зала',
    address: 'вул. Кіото, 19',
    mapQuery: 'Державний торговельно-економічний університет, вулиця Кіото, 19, Київ',
    details: 'Головний вхід з боку парку «Кіото»',
  },
  {
    id: 'b-b',
    code: 'Б',
    title: 'Корпус Б · Бібліотека та ІТ-хаб',
    subtitle: 'Наукова бібліотека, читальні зали, коворкінг',
    address: 'вул. Кіото, 19',
    mapQuery: 'Бібліотека КНТЕУ, вулиця Кіото, 19, Київ',
    details: 'Перехід із корпусу А або окремий вхід',
  },
  {
    id: 'b-v',
    code: 'В',
    title: 'Навчальний корпус В',
    subtitle: 'Лекційні потокові аудиторії, деканати',
    address: 'вул. Кіото, 19',
    mapQuery: 'вулиця Кіото, 19, Київ',
    details: 'Поруч із головним корпусом А',
  },
  {
    id: 'b-g',
    code: 'Г',
    title: 'Навчальний корпус Г',
    subtitle: 'Лабораторії, навчальні кабінети',
    address: 'вул. Мілютенка, 8',
    mapQuery: 'вулиця Мілютенка, 8, Київ',
    details: '10 хвилин пішки від головного кампусу',
  },
  {
    id: 'b-d',
    code: 'Д',
    title: 'Навчальний корпус Д (ФІТ / ФФО)',
    subtitle: 'Факультет інформаційних технологій, комп’ютерні класи',
    address: 'вул. Кіото, 21',
    mapQuery: 'вулиця Кіото, 21, Київ',
    details: 'Через дорогу від парку «Кіото»',
  },
  {
    id: 'b-l',
    code: 'Л',
    title: 'Спортивний комплекс та корпус Л',
    subtitle: 'Спорткомплекс, стадіон, секції',
    address: 'вул. Кіото, 23',
    mapQuery: 'вулиця Кіото, 23, Київ',
    details: 'Спортивне містечко ДТЕУ',
  },
];

interface DirectoryEntry {
  id: string;
  category: 'contacts' | 'links';
  badge: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  url: string;
}

const DTEU_DIRECTORY: DirectoryEntry[] = [
  {
    id: 'dir-site',
    category: 'links',
    badge: 'ОФІЦІЙНИЙ ПОРТАЛ',
    title: 'Офіційний сайт ДТЕУ (SUTE)',
    subtitle: 'Новини, оголошення, структура університету',
    actionLabel: 'knute.edu.ua ↗',
    url: 'https://knute.edu.ua',
  },
  {
    id: 'dir-mia',
    category: 'links',
    badge: 'НАВЧАННЯ',
    title: 'Електронний кабінет МІА:Освіта',
    subtitle: 'Електронний журнал, розклад, залікова книжка',
    actionLabel: 'mia1.knute.edu.ua ↗',
    url: 'https://mia1.knute.edu.ua',
  },
  {
    id: 'dir-moodle',
    category: 'links',
    badge: 'ДИСТАНЦІЙНЕ НАВЧАННЯ',
    title: 'Система дистанційного навчання Moodle',
    subtitle: 'Навчальні курси, тести, матеріали дисциплін',
    actionLabel: 'dl.knute.edu.ua ↗',
    url: 'https://dl.knute.edu.ua',
  },
  {
    id: 'dir-fit',
    category: 'contacts',
    badge: 'ДЕКАНАТ ФІТ',
    title: 'Факультет інформаційних технологій',
    subtitle: 'Корпус Д · вул. Кіото, 21 · fit@knute.edu.ua',
    actionLabel: 'Написати',
    url: 'mailto:fit@knute.edu.ua',
  },
  {
    id: 'dir-ftm',
    category: 'contacts',
    badge: 'ДЕКАНАТ ФТМ',
    title: 'Факультет торгівлі та маркетингу',
    subtitle: 'Корпус А · вул. Кіото, 19 · ftm@knute.edu.ua',
    actionLabel: 'Написати',
    url: 'mailto:ftm@knute.edu.ua',
  },
  {
    id: 'dir-femp',
    category: 'contacts',
    badge: 'ДЕКАНАТ ФЕМП',
    title: 'Факультет економіки, менеджменту та психології',
    subtitle: 'Корпус А · вул. Кіото, 19 · femp@knute.edu.ua',
    actionLabel: 'Написати',
    url: 'mailto:femp@knute.edu.ua',
  },
  {
    id: 'dir-fmtp',
    category: 'contacts',
    badge: 'ДЕКАНАТ ФМТП',
    title: 'Факультет міжнародної торгівлі та права',
    subtitle: 'Корпус А · вул. Кіото, 19 · fmtp@knute.edu.ua',
    actionLabel: 'Написати',
    url: 'mailto:fmtp@knute.edu.ua',
  },
  {
    id: 'dir-ffo',
    category: 'contacts',
    badge: 'ДЕКАНАТ ФФО',
    title: 'Факультет фінансів та обліку',
    subtitle: 'Корпус Б/Д · вул. Кіото, 19 · ffo@knute.edu.ua',
    actionLabel: 'Написати',
    url: 'mailto:ffo@knute.edu.ua',
  },
  {
    id: 'dir-ftb',
    category: 'contacts',
    badge: 'ДЕКАНАТ ФТБ',
    title: 'Факультет технологій та бізнесу',
    subtitle: 'Корпус А/В · вул. Кіото, 19 · ftb@knute.edu.ua',
    actionLabel: 'Написати',
    url: 'mailto:ftb@knute.edu.ua',
  },
];

// ==================== SCREEN 04: СЕРВІСИ ====================
export const ServicesView: React.FC<{
  onNavigate: (page: Page) => void;
}> = ({ onNavigate }) => {
  return (
    <div className="stud-anim-in">
      <div className="stud-page-header">
        <h1 className="stud-h1">Сервіси</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Університет під рукою</span>
        </div>
      </div>

      {/* Основні сервіси за макетом */}
      <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.35rem' }}>
        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('campus')}>
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
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('directory')}>
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
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('bells')}>
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
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('community')}>
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
        </motion.button>
      </div>

      {/* Навчальні інструменти ДТЕУ (Оцінки МІА, Розклад викладачів, Пошук пар) */}
      <div className="stud-section-head">
        <h2 className="stud-section-title">Навчальні інструменти</h2>
      </div>

      <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.35rem' }}>
        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('grades')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Журнал оцінок МІА</div>
            <div className="stud-list-sub">Поточні бали, сесія та підсумкові оцінки</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('teacher-schedule')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Розклад викладачів</div>
            <div className="stud-list-sub">Знайди пари будь-якого викладача ДТЕУ</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} type="button" className="stud-list-card" onClick={() => onNavigate('search')}>
          <span className="stud-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <div className="stud-list-body">
            <div className="stud-list-title">Пошук дисциплін та аудиторій</div>
            <div className="stud-list-sub">Швидкий пошук по всьому розкладу університету</div>
          </div>
          <span className="stud-list-arrow">›</span>
        </motion.button>
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

// ==================== СПІЛЬНОТА (Чати та студентська підтримка) ====================
export const CommunityView: React.FC<{
  onBack: () => void;
  openLink: (url: string) => void;
}> = ({ onBack, openLink }) => {
  const communityLinks = [
    {
      id: 'comm-channel',
      badge: 'ОФІЦІЙНИЙ КАНАЛ',
      title: 'ДТЕУ / SUTE — Офіційний Telegram',
      subtitle: 'Головні новини університету, дайджести та події',
      url: 'https://t.me/knute_official',
    },
    {
      id: 'comm-council',
      badge: 'СТУДЕНТСЬКЕ САМОВРЯДУВАННЯ',
      title: 'Рада студентського самоврядування ДТЕУ',
      subtitle: 'Студентські ініціативи, захист прав студентів та івенти',
      url: 'https://knute.edu.ua/blog/read/?pid=1235',
    },
    {
      id: 'comm-union',
      badge: 'ПІДТРИМКА СТУДЕНТІВ',
      title: 'Первинна профспілкова організація студентів',
      subtitle: 'Гуртожитки, соціальні стипендії, матеріальна допомога',
      url: 'https://knute.edu.ua',
    },
    {
      id: 'comm-psych',
      badge: 'ПСИХОЛОГІЧНА СЛУЖБА',
      title: 'Центр психологічної підтримки ДТЕУ',
      subtitle: 'Безкоштовні та конфіденційні консультації для студентів',
      url: 'https://knute.edu.ua',
    },
  ];

  return (
    <div className="stud-anim-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button type="button" className="stud-back-link" onClick={onBack}>
        ‹ До сервісів
      </button>

      <div className="stud-page-header">
        <h1 className="stud-h1">Спільнота</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Чати, канали та студентська підтримка ДТЕУ</span>
        </div>
      </div>

      <div className="stud-hero-card" style={{ marginBottom: '1rem' }}>
        <div className="stud-hero-eyebrow">РАЗОМ У ДТЕУ</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
          Студентський простір підтримки
        </div>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>
          Приєднуйся до офіційних каналів університету, студентського самоврядування та служб допомоги студентам.
        </p>
      </div>

      <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
        {communityLinks.map((item) => (
          <motion.button
            whileTap={{ scale: 0.98 }}
            key={item.id}
            type="button"
            className="stud-list-card"
            onClick={() => openLink(item.url)}
          >
            <span className="stud-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </span>
            <div className="stud-list-body">
              <div className="stud-list-eyebrow">{item.badge}</div>
              <div className="stud-list-title">{item.title}</div>
              <div className="stud-list-sub">{item.subtitle}</div>
            </div>
            <span className="stud-list-arrow">↗</span>
          </motion.button>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-soft" onClick={onBack}>
          Повернутися до сервісів
        </button>
      </div>
    </div>
  );
};

// ==================== SCREEN 07: КАМПУС (Interactive + Empty State toggle) ====================
export const CampusView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);

  const filteredBuildings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DTEU_BUILDINGS;
    return DTEU_BUILDINGS.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="stud-anim-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button type="button" className="stud-back-link" onClick={onBack}>
        ‹ До сервісів
      </button>

      <div className="stud-page-header">
        <h1 className="stud-h1">Кампус</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">Знайди свій корпус ДТЕУ</span>
        </div>
      </div>

      <div className="stud-form-group" style={{ marginBottom: '0.9rem' }}>
        <input
          type="text"
          className="stud-input"
          placeholder="Пошук за назвою корпусу (А, Б, В, Г, Д, Л...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filteredBuildings.length > 0 ? (
        <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.15rem' }}>
          {filteredBuildings.map((b) => (
            <motion.button
              whileTap={{ scale: 0.98 }}
              key={b.id}
              type="button"
              className="stud-list-card"
              onClick={() => setSelectedBuilding(b)}
            >
              <div className="stud-date-badge stud-date-badge--lime" style={{ width: 44, height: 44 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{b.code}</span>
              </div>
              <div className="stud-list-body">
                <div className="stud-list-title">{b.title}</div>
                <div className="stud-list-sub">{b.subtitle}</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  📍 {b.address} · {b.details}
                </div>
              </div>
              <span className="stud-list-arrow">›</span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="stud-state-card stud-state-card--soft">
          <div className="stud-state-icon" style={{ background: 'transparent', marginBottom: '0.5rem' }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="stud-state-title" style={{ fontSize: '1.05rem' }}>
            Корпус не знайдено
          </div>
          <p className="stud-state-desc">
            Спробуй ввести літеру корпусу (А, Б, В, Г, Д, Л) або адресу.
          </p>
        </div>
      )}

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
          Натисни на корпус для перегляду карти
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          Відкривається інтерактивна супутникова карта кампусу ДТЕУ з точним розташуванням будівлі.
        </p>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-soft" onClick={onBack}>
          Повернутися до сервісів
        </button>
      </div>

      {/* Satellite Map Modal for Selected Building */}
      {selectedBuilding && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBuilding(null)}
          cardStyle={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', height: '380px', position: 'relative', overflow: 'hidden', background: '#e5e3df' }}>
              <iframe
                title={selectedBuilding.title}
                width="100%"
                height="520"
                style={{ border: 0, display: 'block', position: 'absolute', top: '-70px', left: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedBuilding.mapQuery)}&t=k&z=18&output=embed`}
              />
            </div>
            <div style={{ padding: '1.15rem 1.25rem', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedBuilding.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '0.9rem' }}>
                {selectedBuilding.address} · {selectedBuilding.details}
              </div>
              <button
                type="button"
                className="stud-btn-primary"
                onClick={() => setSelectedBuilding(null)}
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

// ==================== SCREEN 08: ДОВІДНИК ====================
export const DirectoryView: React.FC<{
  onBack: () => void;
  openLink: (url: string) => void;
}> = ({ onBack, openLink }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'contacts' | 'links'>('all');

  const filteredItems = useMemo(() => {
    return DTEU_DIRECTORY.filter((item) => {
      if (filter !== 'all' && item.category !== filter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  return (
    <div className="stud-anim-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button type="button" className="stud-back-link" onClick={onBack}>
        ‹ До сервісів
      </button>

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
          placeholder="Пошук у довіднику (МІА, Moodle, деканат...)"
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

      {filteredItems.length > 0 ? (
        <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.25rem' }}>
          {filteredItems.map((item) => (
            <motion.button
              whileTap={{ scale: 0.98 }}
              key={item.id}
              type="button"
              className="stud-list-card"
              onClick={() => openLink(item.url)}
            >
              <span className="stud-icon-box">
                {item.category === 'links' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    <line x1="8" y1="7" x2="16" y2="7" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                )}
              </span>
              <div className="stud-list-body">
                <div className="stud-list-eyebrow">{item.badge}</div>
                <div className="stud-list-title">{item.title}</div>
                <div className="stud-list-sub">{item.subtitle}</div>
              </div>
              <span className="stud-list-arrow">›</span>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="stud-state-card" style={{ padding: '2.5rem 1.5rem' }}>
          <div className="stud-state-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <div className="stud-state-title">За запитом нічого не знайдено</div>
          <p className="stud-state-desc">
            Спробуй інший запит або перемкни фільтр категорій.
          </p>
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button type="button" className="stud-btn-soft" onClick={onBack}>
          Повернутися до сервісів
        </button>
      </div>
    </div>
  );
};
