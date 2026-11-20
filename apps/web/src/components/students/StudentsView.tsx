import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Group, Student } from '../../types';
import { DEMO_STUDENTS } from '../../utils/constants';
import { API } from '../../utils/api';

interface Props {
  students: Student[];
  selectedGroup: Group | null;
  matchedStudentIndex: number;
  userName: string;
  onBack?: () => void;
  openLink?: (url: string) => void;
}

export const StudentsView: React.FC<Props> = ({
  students,
  selectedGroup,
  matchedStudentIndex,
  userName,
  onBack,
  openLink,
}) => {
  const [query, setQuery] = useState('');

  const isDemoList = students.length === 0;

  const displayList = useMemo(() => {
    const mid = Math.ceil((isDemoList ? DEMO_STUDENTS.length : students.length) / 2);
    if (!isDemoList) {
      return students.map((s, idx) => ({
        ...s,
        num: idx + 1,
        isCurrentUser: idx === matchedStudentIndex,
        subLabel: `${idx < mid ? 1 : 2} підгрупа · Студент групи`,
      }));
    }
    return DEMO_STUDENTS.map((s, idx) => ({
      ...s,
      num: idx + 1,
      fullName: idx === 0 && userName.trim() ? userName.trim() : s.fullName,
      isCurrentUser: idx === 0,
      subLabel: 'Демонстраційний запис',
    }));
  }, [students, isDemoList, matchedStudentIndex, userName]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayList;
    return displayList.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [displayList, query]);

  const handleExportCsv = () => {
    if (!selectedGroup || !openLink || isDemoList) return;
    openLink(`${API}/api/groups/students/export?groupId=${selectedGroup.id}`);
  };

  return (
    <div className="stud-anim-in">
      {onBack && (
        <button type="button" className="stud-back-link" onClick={onBack}>
          ‹ До профілю
        </button>
      )}

      <div className="stud-page-header">
        <h1 className="stud-h1">Одногрупники</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}</span>
          {!isDemoList && openLink && (
            <button type="button" className="stud-inline-action" onClick={handleExportCsv}>
              Експорт CSV ↗
            </button>
          )}
        </div>
      </div>

      <div className="stud-form-group" style={{ marginBottom: '0.85rem' }}>
        <input
          type="text"
          className="stud-input"
          placeholder="Пошук за ім’ям"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="stud-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {filteredList.map((student) => (
          <motion.div
            whileTap={{ scale: 0.99 }}
            key={student.id}
            className="stud-list-card"
            style={{
              cursor: 'default',
              padding: '0.85rem 1rem',
              borderColor: student.isCurrentUser ? 'var(--border-strong)' : undefined,
            }}
          >
            <div
              className="stud-icon-box"
              style={{
                borderRadius: '50%',
                width: 40,
                height: 40,
                background: student.isCurrentUser ? 'var(--accent-lime)' : 'var(--bg-surface-alt)',
                color: student.isCurrentUser ? '#0D291E' : 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '0.82rem',
              }}
            >
              {student.isCurrentUser ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ) : (
                student.num
              )}
            </div>
            <div className="stud-list-body">
              <div className="stud-list-title" style={{ fontSize: '0.93rem' }}>
                {student.fullName}
              </div>
              <div className="stud-list-sub" style={{ fontSize: '0.73rem' }}>
                {student.subLabel}
              </div>
            </div>
            {student.isCurrentUser && (
              <span
                style={{
                  padding: '0.28rem 0.65rem',
                  borderRadius: '999px',
                  background: 'var(--bg-surface-alt)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                Ви
              </span>
            )}
          </motion.div>
        ))}
      </div>

      <div className="stud-footnote">
        <div>Ім’я допомагає впізнати себе в групі та автоматично визначити підгрупу.</div>
        <div style={{ marginTop: '0.2rem' }}>
          {isDemoList
            ? `Показано ${filteredList.length} демонстраційних записів.`
            : `Усього студентів у списку: ${filteredList.length}.`}
        </div>
      </div>
    </div>
  );
};
