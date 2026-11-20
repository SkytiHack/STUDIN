import type { ScheduleItem } from '../../types';
import { IconClock } from '../icons';

const formatMinutes = (m: number) => {
  if (m < 60) return `${m} хв`;
  const h = Math.floor(m / 60);
  const remainingMins = m % 60;
  return remainingMins > 0 ? `${h} год ${remainingMins} хв` : `${h} год`;
};

export const NextLessonBanner = ({ nextLesson, minutesUntilNext }: { nextLesson: ScheduleItem; minutesUntilNext: number }) => (
  <div className="next-banner rise">
    <div className="next-banner-icon"><IconClock /></div>
    <div className="next-banner-body">
      <div className="next-banner-label">Наступна пара через <strong>{formatMinutes(minutesUntilNext)}</strong></div>
      <div className="next-banner-subject">{nextLesson.subject} · {nextLesson.startTime}</div>
    </div>
  </div>
);
