import { useState, useEffect } from 'react';
import { API, fetchApi } from '../../utils/api';
import type { ScheduleItem } from '../../types';
import { IconStar } from '../icons';

export const TeacherSchedule = () => {
  const [teachers, setTeachers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApi(`${API}/api/teachers`).then(r => r.json()).then(setTeachers).catch(() => {});
  }, []);

  const filtered = search.length >= 2
    ? teachers.filter(t => t.toLowerCase().includes(search.toLowerCase())).slice(0, 15)
    : [];

  const selectTeacher = async (name: string) => {
    setSelectedTeacher(name);
    setSearch(name);
    setLoading(true);
    try {
      const schedRes = await fetchApi(`${API}/api/schedule/teacher?teacher=${encodeURIComponent(name)}`);
      setSchedule(await schedRes.json());
    } catch { setSchedule([]); }
    setLoading(false);
  };

  const grouped = schedule.reduce((a, item) => {
    const d = new Date(item.date).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
    (a[d] ||= []).push(item); return a;
  }, {} as Record<string, ScheduleItem[]>);

  return (
    <div className="main-card rise">
      <div className="field">
        <label className="field-label">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Пошук викладача
        </label>
        <input type="text" className="field-input" placeholder="Введіть прізвище..." value={search}
          onChange={e => { setSearch(e.target.value); setSelectedTeacher(null); }} />
      </div>

      {!selectedTeacher && filtered.length > 0 && (
        <div className="students-list" style={{marginBottom:'1rem'}}>
          {filtered.map(t => (
            <div key={t} className="student-row" style={{cursor:'pointer'}} onClick={() => selectTeacher(t)}>
              <span className="student-name">{t}</span>
            </div>
          ))}
        </div>
      )}



      {loading ? (
        <div className="loader"><span className="loader-dot"/><span className="loader-dot"/><span className="loader-dot"/></div>
      ) : selectedTeacher && Object.keys(grouped).length === 0 ? (
        <p style={{color:'var(--text-muted)', textAlign:'center', padding:'2rem 0'}}>Розклад не знайдено</p>
      ) : (
        Object.entries(grouped).map(([date, items], di) => (
          <div key={date} className="day-block rise" style={{ animationDelay: `${di * 0.06}s`, opacity: 0 }}>
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
                    <div className="subj">{item.subject}</div>
                    <div className="meta">
                      {item.classroom && <div className="meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Ауд. {item.classroom}</div>}
                      {(item as any).group && <div className="meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>{(item as any).group.name}</div>}
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
