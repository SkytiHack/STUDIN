import React, { useState, useMemo } from 'react';
import type { Group, Student } from '../../types';
import { DEMO_STUDENTS } from '../../utils/constants';

interface Props {
  students: Student[];
  selectedGroup: Group | null;
  matchedStudentIndex: number;
  userName: string;
}

export const StudentsView: React.FC<Props> = ({
  students,
  selectedGroup,
  matchedStudentIndex,
  userName,
}) => {
  const [query, setQuery] = useState('');

  const isDemoList = students.length === 0;

  const displayList = useMemo(() => {
    if (!isDemoList) {
      return students.map((s, idx) => ({
        ...s,
        isCurrentUser: idx === matchedStudentIndex,
        subLabel: 'Студент групи',
      }));
    }
    const demo = DEMO_STUDENTS.map((s, idx) => ({
      ...s,
      fullName: idx === 0 && userName.trim() ? userName.trim() : s.fullName,
      isCurrentUser: idx === 0,
      subLabel: 'Демонстраційний запис',
    }));
    return demo;
  }, [students, isDemoList, matchedStudentIndex, userName]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayList;
    return displayList.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [displayList, query]);

  return (
    <div>
      <div className="stud-page-header">
        <h1 className="stud-h1">Одногрупники</h1>
        <div className="stud-subtitle-row">
          <span className="stud-subtitle">ДТЕУ · {selectedGroup?.name || 'ФТМ 3-10'}</span>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {filteredList.map((student) => (
          <div
            key={student.id}
            className="stud-list-card"
            style={{ cursor: 'default', padding: '0.85rem 1rem' }}
          >
            <div
              className="stud-icon-box"
              style={{
                borderRadius: '50%',
                width: 40,
                height: 40,
                background: student.isCurrentUser ? 'var(--accent-lime)' : 'var(--bg-surface-alt)',
                color: student.isCurrentUser ? '#0D291E' : 'var(--text-primary)',
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
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
          </div>
        ))}
      </div>

      <div className="stud-footnote">
        <div>Ім’я допомагає впізнати себе в групі.</div>
        <div style={{ marginTop: '0.2rem' }}>
          {isDemoList
            ? `Показано ${filteredList.length} демонстраційних записів.`
            : `Усього студентів у списку: ${filteredList.length}.`}
        </div>
      </div>
    </div>
  );
};
