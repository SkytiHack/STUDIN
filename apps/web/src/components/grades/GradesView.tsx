import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Grade } from '../../types';
import { API, fetchApi } from '../../utils/api';
import { useTelegram } from '../../hooks/useTelegram';
import { IconCap } from '../icons';
export const GradesView: React.FC = () => {
  const { tg } = useTelegram();
  const user = tg?.initDataUnsafe?.user;
  const telegramId = user?.id?.toString() || '123456';

  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Login form state
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'journal' | 'session' | 'overall'>('journal');
  const [semesters, setSemesters] = useState<{id: string, name: string}[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  const fetchSemesters = async () => {
    try {
      const res = await fetchApi(`${API}/api/mia/semesters?telegramId=${telegramId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSemesters(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch semesters', e);
    }
  };

  const fetchGrades = async (semesterId?: string) => {
    try {
      setLoading(true);
      const url = `${API}/api/mia/grades?telegramId=${telegramId}&t=${Date.now()}` + (semesterId ? `&semesterId=${semesterId}` : '');
      const res = await fetchApi(url);
      if (!res.ok) {
        let errorMsg = 'Failed to fetch grades';
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) errorMsg += ` (Status ${res.status}): ${text.substring(0, 100)}`;
        }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setGrades(data);
        setIsLoggedIn(true);
      } else {
        setLoginError(data.error || 'Failed to parse grades data');
        setIsLoggedIn(false);
      }
    } catch (e: any) {
      const msg = e.message || '';
      if (msg === 'Not logged in to MIA') {
        setLoginError(''); // Just show the login form, no error
      } else if (msg.includes('MIA Session Expired')) {
        setLoginError('Ваша сесія закінчилась. Будь ласка, увійдіть знову.');
      } else {
        setLoginError(msg || 'Server error while fetching grades');
      }
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSemesters();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) return;
    
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetchApi(`${API}/api/mia/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, login, password })
      });
      if (!res.ok) throw new Error('Login failed');
      await fetchGrades();
    } catch (e: any) {
      setLoginError('Невірний логін або пароль. Спробуйте ще раз.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const filteredGrades = useMemo(() => {
    return grades.filter(g => g.category === activeTab);
  }, [grades, activeTab]);

  if (loading) {
    return (
      <div className="main-wrap">
        <div className="main-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loader" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Завантаження оцінок...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="main-wrap">
        <div className="main-card login-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'var(--gold-100)', borderRadius: '50%', marginBottom: '1.25rem' }}>
              <span style={{color: 'var(--gold-500)', display: 'flex'}}><IconCap size={36} /></span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>Вхід до МІА</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '280px', margin: '0 auto' }}>
              Увійдіть зі своїм логіном від електронного журналу, щоб бачити оцінки прямо тут. Ми не зберігаємо ваші паролі.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
            {loginError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1rem' }}>
                {loginError}
              </div>
            )}
            
            <div className="field">
              <label className="field-label">Логін</label>
              <input 
                type="text" 
                value={login} 
                onChange={e => setLogin(e.target.value)} 
                placeholder="Введіть логін"
                className="field-input"
                required
              />
            </div>

            <div className="divider" />

            <div className="field">
              <label className="field-label">Пароль</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Введіть пароль"
                className="field-input"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-save"
              style={{ marginTop: '1.5rem' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Авторизація...' : 'Увійти'} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="main-wrap">
      
      {/* TABS */}
      <div style={{ padding: '0 0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
        
        {semesters.length > 0 && activeTab === 'session' && (
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <select 
              value={selectedSemester}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSemester(val);
                fetchGrades(val);
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--gray-200)',
                background: 'var(--white)',
                color: 'var(--text)',
                fontSize: '0.95rem',
                fontWeight: 600,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <option value="">Поточний семестр (Актуальний)</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-400)' }}>
              ▼
            </div>
          </div>
        )}
        <div className="tabs rise">
          {(['journal', 'overall', 'session'] as const).map((tab) => {
            const labels = { journal: 'Журнал', overall: 'Підсумкова', session: 'Сесія' };
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab ${isActive ? 'tab--active' : ''}`}
              >
                {labels[tab]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="main-card">
        {filteredGrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'var(--gold-100)', padding: '1.5rem', borderRadius: '50%', color: 'var(--gold-500)' }}>
                <IconCap size={48} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem', fontWeight: 600 }}>Оцінок ще немає</h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '280px', margin: '0 auto' }}>
              Схоже, у цій категорії ще немає виставлених оцінок. Зазвичай оцінки з'являються після початку навчання!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredGrades.map((grade, i) => {
              const percent = grade.maxScore > 0 ? (grade.currentScore / grade.maxScore) * 100 : 0;
              let barColor = 'var(--gold-500)';
              if (percent < 50) barColor = '#ef4444';
              else if (percent >= 90) barColor = '#10b981';

              return (
                <div key={i} style={{ padding: '1.25rem', background: 'var(--gray-50)', borderRadius: '16px', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem', paddingRight: '1rem', lineHeight: 1.3 }}>
                      {grade.subject}
                    </div>
                    <div style={{ fontWeight: 700, color: barColor, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                      {grade.currentScore} <span style={{ color: 'var(--text-muted)', fontSize: '0.85em', fontWeight: 500 }}>/ {grade.maxScore}</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'var(--gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(percent, 100)}%`, 
                        background: barColor,
                        borderRadius: '3px',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
