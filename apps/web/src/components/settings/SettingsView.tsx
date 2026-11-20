import type { Group } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { IconSun, IconMoon } from '../icons';

interface Props {
  selectedGroup: Group | null;
  editName: string;
  setEditName: (n: string) => void;
  subgroupOverride: number;
  setSubgroupOverride: (n: number) => void;
  matchedStudentIndex: number;
  autoSubgroup: number;
  notify15Min: boolean; setNotify15Min: (v: boolean) => void;
  notify1Min: boolean; setNotify1Min: (v: boolean) => void;
  notifyMorning: boolean; setNotifyMorning: (v: boolean) => void;
  notifyChanges: boolean; setNotifyChanges: (v: boolean) => void;
  onSave: () => void;
  onReset: () => void;
  onOpenHint: () => void;
}

export const SettingsView = ({ selectedGroup, editName, setEditName, subgroupOverride, setSubgroupOverride, matchedStudentIndex, autoSubgroup, notify15Min, setNotify15Min, notify1Min, setNotify1Min, notifyMorning, setNotifyMorning, notifyChanges, setNotifyChanges, onSave, onReset, onOpenHint }: Props) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="main-card rise">
      <div className="settings-section">
        <h3 className="settings-title">Ваше ПІ</h3>
        <input type="text" className="field-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Прізвище Ім'я" maxLength={30} />
        <button type="button" onClick={onOpenHint} className="hint-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gold-500)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span style={{ borderBottom: '1px dashed var(--gray-400)' }}>Навіщо вказувати Прізвище та Ім'я?</span>
        </button>
      </div>
      <div className="divider" />
      <div className="settings-section">
        <h3 className="settings-title">Поточна група</h3>
        <p className="settings-value">{selectedGroup?.name}</p>
        <button className="btn-outline-green" onClick={onReset} style={{marginTop:'0.75rem'}}>Змінити групу</button>
      </div>
      <div className="divider" />
      <div className="settings-section">
        <h3 className="settings-title">Підгрупа (Англійська тощо)</h3>
        <select className="field-select" style={{marginTop:'0.5rem', opacity: matchedStudentIndex === -1 ? 0.6 : 1}} value={subgroupOverride} onChange={e => setSubgroupOverride(parseInt(e.target.value, 10))} disabled={matchedStudentIndex === -1}>
          <option value="0">Автоматично {autoSubgroup ? `(Підгрупа ${autoSubgroup})` : ''}</option>
          <option value="1">1 підгрупа</option>
          <option value="2">2 підгрупа</option>
        </select>
        {matchedStudentIndex === -1 && editName.trim() ? (
          <p style={{fontSize:'0.75rem', color:'#f59e0b', marginTop:'0.5rem', lineHeight:'1.4'}}>
            Вас не знайдено у списку групи {selectedGroup?.name}. Вибір підгрупи заблоковано.
          </p>
        ) : matchedStudentIndex === -1 && !editName.trim() ? (
          <p style={{fontSize:'0.75rem', color:'#f59e0b', marginTop:'0.5rem', lineHeight:'1.4'}}>
            Введіть Прізвище та Ім'я вище, щоб розблокувати налаштування підгруп.
          </p>
        ) : (
          <p style={{fontSize:'0.75rem', color:'var(--gray-500)', marginTop:'0.5rem', lineHeight:'1.4'}}>
            Якщо обрано Авто, ми автоматично визначаємо вашу підгрупу за вашим місцем у списку групи.
          </p>
        )}
      </div>
      <div className="divider" />
      <div className="settings-section">
        <h3 className="settings-title">Тема оформлення</h3>
        <div className="theme-switcher">
          <button className={`theme-btn ${theme === 'light' ? 'theme-btn--active' : ''}`} onClick={() => setTheme('light')}>
            <IconSun size={18} /> Світла
          </button>
          <button className={`theme-btn ${theme === 'dark' ? 'theme-btn--active' : ''}`} onClick={() => setTheme('dark')}>
            <IconMoon size={18} /> Темна
          </button>
          <button className={`theme-btn ${theme === 'system' ? 'theme-btn--active' : ''}`} onClick={() => setTheme('system')}>
            Авто
          </button>
        </div>
      </div>
      <div className="divider" />
      <div className="settings-section">
        <h3 className="settings-title">Сповіщення</h3>
        <div className="toggle-row">
          <span className="toggle-label">Нагадування за 15 хв</span>
          <label className="toggle-switch"><input type="checkbox" checked={notify15Min} onChange={e => setNotify15Min(e.target.checked)} /><span className="toggle-slider"></span></label>
        </div>
        <div className="toggle-row">
          <span className="toggle-label">Нагадування за 1 хв</span>
          <label className="toggle-switch"><input type="checkbox" checked={notify1Min} onChange={e => setNotify1Min(e.target.checked)} /><span className="toggle-slider"></span></label>
        </div>
        <div className="toggle-row">
          <span className="toggle-label">Ранковий розклад (07:30)</span>
          <label className="toggle-switch"><input type="checkbox" checked={notifyMorning} onChange={e => setNotifyMorning(e.target.checked)} /><span className="toggle-slider"></span></label>
        </div>
        <div className="toggle-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, paddingRight: '1rem' }}>
            <span className="toggle-label" style={{ fontWeight: 600 }}>Зміни в розкладі</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', lineHeight: '1.4' }}>Отримувати повідомлення, коли деканат переносить пари або змінює викладача</span>
          </div>
          <label className="toggle-switch"><input type="checkbox" checked={notifyChanges} onChange={e => setNotifyChanges(e.target.checked)} /><span className="toggle-slider"></span></label>
        </div>
      </div>
      <button className="btn-save" onClick={onSave} style={{marginTop:'1.5rem'}}>Зберегти</button>
    </div>
  );
};
