import { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';

export const AdminPanel = ({ secret, api }: { secret: string; api: string }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchApi(`${api}/api/admin/analytics?secret=${encodeURIComponent(secret)}`)
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [secret, api]);

  if (loading) return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="spinner"></div></div>;
  
  if (!stats || stats.error) return (
    <div style={{ padding: '2rem' }}>
      <div className="main-card" style={{ color: '#ff4d4d', textAlign: 'center', background: 'rgba(255, 0, 0, 0.05)', border: '1px dashed rgba(255, 0, 0, 0.2)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{margin: '0 auto 10px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style={{fontWeight: 600, fontSize: '0.9rem'}}>Помилка доступу до адмін-панелі</div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="main-card rise" style={{ padding: '1.2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '0.1s' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gold-100)', color: 'var(--gold-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text)', lineHeight: 1 }}>{stats.activeNow}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '6px', letterSpacing: '0.5px' }}>Онлайн Зараз</div>
        </div>
        <div className="main-card rise" style={{ padding: '1.2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '0.15s' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(45, 99, 85, 0.1)', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text)', lineHeight: 1 }}>{stats.dau}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '6px', letterSpacing: '0.5px' }}>DAU (Сьогодні)</div>
        </div>
      </div>
      
      <div className="main-card rise" style={{ padding: '1.2rem', marginBottom: '1rem', animationDelay: '0.2s' }}>
        <h3 className="settings-title" style={{ marginBottom: '1.2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-500)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Активність за 7 днів
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stats.weekly?.length === 0 ? <div style={{color:'var(--text-muted)', fontSize:'0.9rem', textAlign:'center'}}>Немає даних</div> : null}
          {stats.weekly?.map((day: any) => (
            <div key={day.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', width: '55px', fontWeight: 500 }}>
                {new Date(day.date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' }).replace('.', '')}
              </div>
              <div style={{ flex: 1, margin: '0 12px', height: '8px', background: 'var(--surface-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--gold-400), var(--gold-500))', borderRadius: '4px', width: `${Math.min(100, (day.count / Math.max(1, stats.dau)) * 100)}%`, transition: 'width 1s ease-out' }} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', width: '35px', textAlign: 'right', color: 'var(--text)' }}>{day.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="main-card rise" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animationDelay: '0.25s', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '10px', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Користувачів у базі</div>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--green-800)' }}>{stats.totalUsers}</div>
      </div>

      {stats.recentChanges !== undefined && (
        <div className="main-card rise" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animationDelay: '0.3s', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(197,165,90,0.1)', padding: '8px', borderRadius: '10px', color: 'var(--gold-500)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Змін за 7 днів</div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--gold-500)' }}>{stats.recentChanges}</div>
        </div>
      )}

      <div className="main-card rise" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '10px', animationDelay: '0.35s' }}>
         <h3 className="settings-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>Дії адміністратора</h3>
         <button className="btn-save" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: syncing ? 0.7 : 1 }} disabled={syncing}
            onClick={async () => {
               setSyncing(true);
               try {
                 await fetchApi(`${api}/api/sync?secret=${encodeURIComponent(secret)}`);
                 alert("Синхронізацію успішно запущено на сервері!");
               } catch { alert("Помилка запуску синхронізації."); }
               setSyncing(false);
            }}>
            {syncing ? <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff', borderLeftColor: '#fff' }}></div> :
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.67-5.67"/></svg>
            }
            Примусово оновити розклад
         </button>
      </div>
    </div>
  );
};
