import type { Tab } from '../../types';

export const ScheduleTabs = ({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) => (
  <div className="tabs rise" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
    <button className={`tab ${tab === 'today' ? 'tab--active' : ''}`} onClick={() => setTab('today')}>Сьогодні</button>
    <button className={`tab ${tab === 'tomorrow' ? 'tab--active' : ''}`} onClick={() => setTab('tomorrow')}>Завтра</button>
    <button className={`tab ${tab === 'week' ? 'tab--active' : ''}`} onClick={() => setTab('week')}>Тиждень</button>
    <button className={`tab ${tab === 'month' ? 'tab--active' : ''}`} onClick={() => setTab('month')}>Місяць</button>
  </div>
);
