import type { ReactNode } from 'react';

export const HeroHeader = ({ title, subtitle, rightElement }: { title: ReactNode, subtitle?: ReactNode, rightElement?: ReactNode }) => (
  <div className="hero">
    <div className="hero-inner rise">
      <div className="hero-logo">
        <img src="/logo.png" alt="SUTE" />
        <div>
          <div className="hero-logo-text">SUTE Schedule</div>
          <div className="hero-logo-sub">Розклад занять</div>
        </div>
      </div>
      <div className="hero-main-row">
        <div className="hero-titles">
          <h1 className="hero-title">{title}</h1>
          {subtitle && typeof subtitle === 'string' ? <p className="hero-desc">{subtitle}</p> : subtitle}
        </div>
        {rightElement && <div className="hero-actions">{rightElement}</div>}
      </div>
    </div>
  </div>
);
