import { useState } from 'react';
import { API, fetchApi } from '../../utils/api';
import type { ScheduleItem } from '../../types';
import { badgeClass, typeLabel } from '../../utils/constants';

export const SearchView = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(ScheduleItem & { group?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetchApi(`${API}/api/search?q=${encodeURIComponent(query.trim())}`);
      setResults(await res.json());
    } catch { setResults([]); }
    setLoading(false);
  };

  const grouped = results.reduce((a, item) => {
    const d = new Date(item.date).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
    (a[d] ||= []).push(item); return a;
  }, {} as Record<string, typeof results>);

  return (
    <div className="main-card rise">
      <div className="field">
        <label className="field-label">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Пошук предмета або викладача
        </label>
        <div style={{display:'flex', gap:'0.5rem'}}>
          <input type="text" className="field-input" placeholder="Напр: Інформатика, Шевченко..." value={query}
            onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
          <button className="btn-save" style={{width:'auto', padding:'0.85rem 1.2rem', marginTop:0}} onClick={doSearch} disabled={query.trim().length < 2}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loader"><span className="loader-dot"/><span className="loader-dot"/><span className="loader-dot"/></div>
      ) : searched && results.length === 0 ? (
        <p style={{color:'var(--text-muted)', textAlign:'center', padding:'2rem 0'}}>Нічого не знайдено</p>
      ) : (
        Object.entries(grouped).map(([date, items], di) => (
          <div key={date} className="day-block rise" style={{ animationDelay: `${di * 0.06}s`, opacity: 0, marginTop: di === 0 ? '1rem' : undefined }}>
            <h3 className="day-label">{date}</h3>
            <div className="lessons">
              {items.map((item, i) => (
                <div key={item.id || i} className="lesson">
                  <div className="time-col">
                    <span className="time-start">{item.startTime}</span>
                    <div className="time-sep" />
                    <span className="time-end">{item.endTime}</span>
                  </div>
                  <div className="info-col">
                    <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.4rem',flexWrap:'wrap'}}>
                      <span className={`badge ${badgeClass(item.type)}`}>{typeLabel(item.type)}</span>
                      {item.group && <span className="badge" style={{background:'var(--gold-100)', color:'var(--gold-500)'}}>{item.group.name}</span>}
                    </div>
                    <div className="subj">{item.subject}</div>
                    <div className="meta">
                      {item.teacher && <div className="meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{item.teacher}</div>}
                      {item.classroom && <div className="meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Ауд. {item.classroom}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
