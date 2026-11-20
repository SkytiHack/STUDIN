import type { StudEvent } from '../types';
import { API, fetchApi } from './api';

const SUTE_API_BASE = 'https://adm.sute.edu.ua/api/v1/entity';
const SUTE_WEB_BASE = 'https://sute.edu.ua';

const MONTH_SHORT_MAP: Record<string, string> = {
  'січня': 'січ',
  'лютого': 'лют',
  'березня': 'бер',
  'квітня': 'кві',
  'травня': 'тра',
  'червня': 'чер',
  'липня': 'лип',
  'серпня': 'сер',
  'вересня': 'вер',
  'жовтня': 'жов',
  'листопада': 'лис',
  'грудня': 'гру',
};

function classifyEvent(title: string): {
  category: 'study' | 'studlife' | 'opportunities';
  categoryBadge: string;
  subtitle: string;
} {
  const lower = title.toLowerCase();
  if (
    lower.includes('конкурс') ||
    lower.includes('кар\'єр') ||
    lower.includes('career') ||
    lower.includes('стипенд') ||
    lower.includes('грант') ||
    lower.includes('стажуван') ||
    lower.includes('хакатон')
  ) {
    return {
      category: 'opportunities',
      categoryBadge: 'МОЖЛИВОСТІ · КОНКУРС',
      subtitle: 'Конкурси, кар’єра та можливості для студентів ДТЕУ',
    };
  }
  if (
    lower.includes('семінар') ||
    lower.includes('тренінг') ||
    lower.includes('конференц') ||
    lower.includes('лекці') ||
    lower.includes('круглий стіл') ||
    lower.includes('науков') ||
    lower.includes('майстер-клас') ||
    lower.includes('вченої ради')
  ) {
    return {
      category: 'study',
      categoryBadge: 'НАВЧАННЯ · НАУКА',
      subtitle: 'Наукові семінари, круглі столи та освітні зустрічі',
    };
  }
  return {
    category: 'studlife',
    categoryBadge: 'СТУДЖИТТЯ · ДТЕУ',
    subtitle: 'Події та студентське життя університету',
  };
}

function stripHtmlClient(html: string): { cleanText: string; actionUrl?: string } {
  if (!html) return { cleanText: '' };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let actionUrl: string | undefined;

  doc.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (
      !actionUrl &&
      href.startsWith('http') &&
      (href.includes('zoom.us') ||
        href.includes('teams.microsoft') ||
        href.includes('meet.google') ||
        href.includes('forms.gle') ||
        href.includes('.pdf'))
    ) {
      actionUrl = href;
    }
  });

  doc.querySelectorAll('p, li, br').forEach((el) => {
    el.append('\n');
  });

  const cleanText = (doc.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanText, actionUrl };
}

/**
 * Fetches live events from our backend (/api/events), or directly from
 * SUTE's official headless JSON API (https://adm.sute.edu.ua/api/v1/entity?alias=/events&language=uk).
 */
export async function fetchUniversityEvents(): Promise<StudEvent[]> {
  // 1. Try our backend DB cache first
  try {
    const apiRes = await fetchApi(`${API}/api/events`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((ev: any, idx: number) => ({
          ...ev,
          isFeatured: idx === 0,
          isLive: true,
        }));
      }
    }
  } catch {
    // Fallback to direct SUTE JSON API
  }

  // 2. Direct JSON API fetch from adm.sute.edu.ua
  const res = await fetch(`${SUTE_API_BASE}?alias=/events&language=uk`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('SUTE JSON API unavailable');
  const data = await res.json();

  const centerBlocks: any[] = data?.content?.center || [];
  const latestBlock = centerBlocks.find((b) => b.type === 'latest_events' && Array.isArray(b.events));
  const rawEvents: any[] = latestBlock?.events || [];

  const seen = new Set<string>();
  const uniqueRaw = rawEvents.filter((item) => {
    if (!item?.uri || seen.has(item.uri)) return false;
    seen.add(item.uri);
    return true;
  });

  return uniqueRaw.slice(0, 12).map((item, idx) => {
    const uri: string = item.uri;
    const rawTitle = (item.title || 'Подія ДТЕУ').trim();
    const dayNum = String(item.date || '01').padStart(2, '0');
    const monthFull = (item.month || 'листопада').toLowerCase().trim();
    const monthShort = MONTH_SHORT_MAP[monthFull] || monthFull.slice(0, 3);
    const { category, categoryBadge, subtitle } = classifyEvent(rawTitle);

    return {
      id: uri.replace(/^\/events\//, '') || `sute-${idx}`,
      uri,
      title: rawTitle,
      subtitle,
      category,
      categoryBadge: idx === 0 ? 'НАЙБЛИЖЧА ПОДІЯ · SUTE' : categoryBadge,
      dateLabel: `${parseInt(dayNum, 10)} ${monthFull}`,
      dayNum,
      monthShort,
      timeInfo: 'Час уточнюється за програмою',
      locationTitle: rawTitle.toLowerCase().includes('онлайн') ? 'Онлайн формат' : 'ДТЕУ · Кампус / Онлайн',
      locationSub: 'Державний торговельно-економічний університет',
      description: rawTitle,
      sourceUrl: `${SUTE_WEB_BASE}${uri}`,
      organizerInfo: 'Джерело: Офіційний портал ДТЕУ (sute.edu.ua)',
      registrationOpen: true,
      isFeatured: idx === 0,
      isLive: true,
    };
  });
}

/**
 * Lazy-loads full details (time, place, Zoom link, full description) for a single event
 * directly from SUTE JSON API if not yet loaded.
 */
export async function fetchSingleEventDetails(ev: StudEvent): Promise<StudEvent> {
  if (!ev.uri) return ev;

  try {
    const res = await fetch(`${SUTE_API_BASE}?alias=${encodeURIComponent(ev.uri)}&language=uk`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return ev;
    const detailData = await res.json();
    const eventCenter = (detailData?.content?.center || []).find((c: any) => c.type === 'event');
    if (!eventCenter) return ev;

    let timeInfo = ev.timeInfo;
    const meta = eventCenter.metaInfo || {};
    if (meta.startTime) {
      const st = meta.startTime.slice(0, 5);
      const et = meta.endTime ? meta.endTime.slice(0, 5) : '';
      timeInfo = et && et !== st ? `${st} — ${et}` : `Початок о ${st}`;
    } else if (eventCenter.date && eventCenter.date.includes(',')) {
      const parts = eventCenter.date.split(',');
      if (parts[1]?.trim()) timeInfo = `Початок о ${parts[1].trim()}`;
    }

    let locationTitle = ev.locationTitle;
    let locationSub = ev.locationSub;
    const rawPlace = (eventCenter.place || '').trim();
    if (rawPlace.toLowerCase() === 'online' || ev.title.toLowerCase().includes('онлайн')) {
      locationTitle = 'Онлайн формат';
      locationSub = 'Відеоконференція (Zoom / Teams)';
    } else if (rawPlace) {
      locationTitle = rawPlace;
      locationSub = 'Державний торговельно-економічний університет';
    }

    let description = ev.description;
    let actionUrl = ev.actionUrl;
    if (eventCenter.description) {
      const parsed = stripHtmlClient(eventCenter.description);
      if (parsed.cleanText) description = parsed.cleanText;
      if (parsed.actionUrl) actionUrl = parsed.actionUrl;
    }

    return {
      ...ev,
      timeInfo,
      locationTitle,
      locationSub,
      description,
      descriptionHtml: eventCenter.description,
      actionUrl,
    };
  } catch {
    return ev;
  }
}
