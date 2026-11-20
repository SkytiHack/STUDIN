import React from 'react';
import type { NavTab } from '../../types';

export const TopHeader: React.FC<{
  onBellClick?: () => void;
  onBrandClick?: () => void;
}> = ({ onBellClick, onBrandClick }) => (
  <header className="stud-topbar">
    <div className="stud-brand" onClick={onBrandClick} role={onBrandClick ? 'button' : undefined}>
      <span className="stud-brand-title">STUD IN</span>
      <span className="stud-brand-sub">ТВІЙ СТУДЕНТСЬКИЙ ПРОСТІР</span>
    </div>
    {onBellClick && (
      <button type="button" className="stud-bell-btn" onClick={onBellClick} aria-label="Сповіщення">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
    )}
  </header>
);

export const BottomNav: React.FC<{
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Головна',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
      ),
    },
    {
      id: 'schedule',
      label: 'Розклад',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      id: 'services',
      label: 'Сервіси',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.8" />
          <rect x="14" y="3" width="7" height="7" rx="1.8" />
          <rect x="14" y="14" width="7" height="7" rx="1.8" />
          <rect x="3" y="14" width="7" height="7" rx="1.8" />
        </svg>
      ),
    },
    {
      id: 'events',
      label: 'Події',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l2.4 7.2L22 12l-7.6 1.8L12 21l-2.4-7.2L2 12l7.6-1.8L12 3z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Профіль',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="stud-bottom-nav" aria-label="Основна навігація">
      <div className="stud-bottom-nav-inner">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`stud-nav-item ${isActive ? 'stud-nav-item--active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <span className="stud-nav-pill">{item.icon}</span>
              <span className="stud-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
