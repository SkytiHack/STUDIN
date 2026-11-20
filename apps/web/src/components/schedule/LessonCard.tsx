import type { ScheduleItem } from '../../types';
import { badgeClass, typeLabel, getNowTimeString } from '../../utils/constants';
import teacherLinks from '../../assets/teachers.json';

const renderTeacher = (name: string, openLink: (url: string) => void) => {
  const url = (teacherLinks as Record<string, string>)[name.toLowerCase()];
  const finalUrl = url || `https://www.google.com/search?q=site:knute.edu.ua+"${encodeURIComponent(name)}"`;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openLink(finalUrl);
  };
  return <span className="teacher-link" onClick={handleClick}>{name}</span>;
};

export const LessonCard = ({ item, isToday, now, openLink, onAudienceClick }: { item: ScheduleItem; isToday: boolean; now: Date; openLink: (url: string) => void; onAudienceClick?: (classroom: string) => void }) => {
  const nowStr = getNowTimeString(now);
  const isNow = isToday && nowStr >= item.startTime && nowStr <= item.endTime;

  return (
    <div className={`lesson ${isNow ? 'lesson--now' : ''}`}>
      <div className="time-col">
        <span className="time-start">{item.startTime}</span>
        <div className="time-sep" />
        <span className="time-end">{item.endTime}</span>
      </div>
      <div className="info-col">
        <div style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'0.4rem'}}>
          <span className={`badge ${badgeClass(item.type)}`}>{item.lessonNumber} пара · {typeLabel(item.type)}</span>
          {isNow && <span className="badge badge--now">Зараз</span>}
        </div>
        <div className="subj">{item.subject}</div>
        {item.annotation && (
          <div style={{ color: 'var(--gold-400)', fontSize: '0.8rem', marginTop: '2px', marginBottom: '4px', fontStyle: 'italic', display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
            <svg style={{flexShrink:0, marginTop: '2px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div dangerouslySetInnerHTML={{ __html: (() => {
              const txt = document.createElement('textarea');
              txt.innerHTML = item.annotation;
              return txt.value;
            })() }} style={{ wordBreak: 'break-word', overflow: 'hidden' }} className="annotation-content" />
          </div>
        )}
        <div className="meta">
          {item.teacher && <div className="meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{renderTeacher(item.teacher, openLink)}</div>}
          {item.classroom && (
            <div 
              className="meta-row" 
              style={{ cursor: onAudienceClick ? 'pointer' : 'default', textDecoration: onAudienceClick ? 'underline' : 'none', textUnderlineOffset: '3px', decorationColor: 'rgba(255,255,255,0.3)' }}
              onClick={(e) => {
                if (onAudienceClick) {
                  e.stopPropagation();
                  onAudienceClick(item.classroom!);
                }
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Ауд. {item.classroom}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

