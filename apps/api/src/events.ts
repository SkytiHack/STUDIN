import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from './prisma';

const SUTE_API_BASE = 'https://adm.sute.edu.ua/api/v1/entity';
const SUTE_WEB_BASE = 'https://sute.edu.ua';

export interface ParsedSuteEvent {
  id: string;
  uri: string;
  externalId?: string;
  title: string;
  subtitle: string;
  category: 'study' | 'studlife' | 'opportunities';
  categoryBadge: string;
  dateLabel: string;
  dayNum: string;
  monthShort: string;
  startDate: Date | null;
  timeInfo: string;
  locationTitle: string;
  locationSub: string;
  description: string;
  descriptionHtml?: string;
  actionUrl?: string;
  sourceUrl: string;
  isSticky: boolean;
  isFeatured?: boolean;
}

const MONTH_MAP: Record<string, { short: string; index: number }> = {
  'січня': { short: 'січ', index: 0 },
  'лютого': { short: 'лют', index: 1 },
  'березня': { short: 'бер', index: 2 },
  'квітня': { short: 'кві', index: 3 },
  'травня': { short: 'тра', index: 4 },
  'червня': { short: 'чер', index: 5 },
  'липня': { short: 'лип', index: 6 },
  'серпня': { short: 'сер', index: 7 },
  'вересня': { short: 'вер', index: 8 },
  'жовтня': { short: 'жов', index: 9 },
  'листопада': { short: 'лис', index: 10 },
  'грудня': { short: 'гру', index: 11 },
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
    lower.includes('хакатон') ||
    lower.includes('олімпіад')
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
    lower.includes('вченої ради') ||
    lower.includes('воркшоп')
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

function parseHtmlDescription(html: string): {
  cleanText: string;
  actionUrl?: string;
  extractedPlace?: string;
} {
  if (!html) return { cleanText: '' };

  const $ = cheerio.load(html);
  let actionUrl: string | undefined;

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (
      !actionUrl &&
      href.startsWith('http') &&
      (href.includes('zoom.us') ||
        href.includes('teams.microsoft') ||
        href.includes('meet.google') ||
        href.includes('forms.gle') ||
        href.includes('docs.google') ||
        href.includes('.pdf'))
    ) {
      actionUrl = href;
    }
  });

  // Add line breaks after paragraphs and list items for clean plain text
  $('p, li, br').each((_, el) => {
    $(el).append('\n');
  });

  const cleanText = $.text()
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanText, actionUrl };
}

/**
 * Fetches live events directly from SUTE's official headless JSON API:
 * https://adm.sute.edu.ua/api/v1/entity?alias=/events&language=uk
 */
export async function fetchLiveSuteEvents(): Promise<ParsedSuteEvent[]> {
  const listUrl = `${SUTE_API_BASE}?alias=/events&language=uk`;
  const response = await axios.get(listUrl, {
    timeout: 12000,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'STUDIN-DTEU-Sync/1.0',
    },
  });

  const data = response.data;
  const centerBlocks: any[] = data?.content?.center || [];
  const latestBlock = centerBlocks.find((b) => b.type === 'latest_events' && Array.isArray(b.events));
  let rawEvents: any[] = latestBlock?.events || [];

  // Fallback to calendar_events in content.left if center is empty
  if (rawEvents.length === 0) {
    const leftBlocks: any[] = data?.content?.left || [];
    const calBlock = leftBlocks.find((b) => b.type === 'calendar_events' && b.events);
    if (calBlock?.events) {
      for (const dateKey of Object.keys(calBlock.events)) {
        const arr = calBlock.events[dateKey];
        if (Array.isArray(arr)) rawEvents.push(...arr);
      }
    }
  }

  // Deduplicate by URI
  const seenUris = new Set<string>();
  const uniqueRaw = rawEvents.filter((item) => {
    if (!item?.uri || seenUris.has(item.uri)) return false;
    seenUris.add(item.uri);
    return true;
  });

  // Fetch details concurrently in small batches for the top 12 events
  const targetEvents = uniqueRaw.slice(0, 12);

  const detailedEvents = await Promise.all(
    targetEvents.map(async (item, index): Promise<ParsedSuteEvent> => {
      const uri: string = item.uri;
      const rawTitle = (item.title || 'Подія ДТЕУ').trim();
      const dayNum = String(item.date || '01').padStart(2, '0');
      const monthFull = (item.month || 'листопада').toLowerCase().trim();
      const monthMeta = MONTH_MAP[monthFull] || { short: monthFull.slice(0, 3), index: new Date().getMonth() };
      const dateLabel = `${parseInt(dayNum, 10)} ${monthFull}`;

      const { category, categoryBadge, subtitle } = classifyEvent(rawTitle);

      let externalId: string | undefined;
      let startDate: Date | null = null;
      let timeInfo = 'Час за програмою заходу';
      let locationTitle = 'ДТЕУ · Кампус / Онлайн';
      let locationSub = 'Київ, вул. Кіото, 19';
      let description = rawTitle;
      let descriptionHtml: string | undefined;
      let actionUrl: string | undefined;

      try {
        const detailRes = await axios.get(
          `${SUTE_API_BASE}?alias=${encodeURIComponent(uri)}&language=uk`,
          {
            timeout: 8000,
            headers: { Accept: 'application/json' },
          }
        );

        const detailData = detailRes.data;
        const eventCenter = (detailData?.content?.center || []).find((c: any) => c.type === 'event');

        if (eventCenter) {
          externalId = String(eventCenter.id || detailData.id || '');
          const meta = eventCenter.metaInfo || {};

          if (meta.startDate) {
            const parsedDate = new Date(`${meta.startDate}T00:00:00Z`);
            if (!isNaN(parsedDate.getTime())) startDate = parsedDate;
          }

          if (meta.startTime) {
            const st = meta.startTime.slice(0, 5);
            const et = meta.endTime ? meta.endTime.slice(0, 5) : '';
            timeInfo = et && et !== st ? `${st} — ${et}` : `Початок о ${st}`;
          } else if (eventCenter.date && eventCenter.date.includes(',')) {
            const parts = eventCenter.date.split(',');
            if (parts[1]?.trim()) timeInfo = `Початок о ${parts[1].trim()}`;
          }

          const rawPlace = (eventCenter.place || '').trim();
          if (rawPlace.toLowerCase() === 'online' || rawTitle.toLowerCase().includes('онлайн')) {
            locationTitle = 'Онлайн формат';
            locationSub = 'Відеоконференція (Zoom / Teams)';
          } else if (rawPlace) {
            locationTitle = rawPlace;
            locationSub = 'Державний торговельно-економічний університет';
          }

          if (eventCenter.description) {
            descriptionHtml = eventCenter.description;
            const parsed = parseHtmlDescription(eventCenter.description);
            if (parsed.cleanText) description = parsed.cleanText;
            if (parsed.actionUrl) actionUrl = parsed.actionUrl;
          }
        }
      } catch {
        // Fallback to list info if single detail request times out
      }

      if (!startDate) {
        const now = new Date();
        startDate = new Date(Date.UTC(now.getFullYear(), monthMeta.index, parseInt(dayNum, 10) || 1));
      }

      return {
        id: uri.replace(/^\/events\//, '') || `sute-ev-${index}`,
        uri,
        externalId,
        title: rawTitle,
        subtitle,
        category,
        categoryBadge: index === 0 ? 'НАЙБЛИЖЧА ПОДІЯ · SUTE' : categoryBadge,
        dateLabel,
        dayNum,
        monthShort: monthMeta.short,
        startDate,
        timeInfo,
        locationTitle,
        locationSub,
        description,
        descriptionHtml,
        actionUrl,
        sourceUrl: `${SUTE_WEB_BASE}${uri}`,
        isSticky: Boolean(item.isSticky),
        isFeatured: index === 0,
      };
    })
  );

  return detailedEvents;
}

/**
 * Synchronizes events from adm.sute.edu.ua JSON API into PostgreSQL DB
 */
export async function syncEventsToDb(): Promise<ParsedSuteEvent[]> {
  try {
    const liveEvents = await fetchLiveSuteEvents();
    if (liveEvents.length === 0) return [];

    for (const ev of liveEvents) {
      await prisma.universityEvent.upsert({
        where: { uri: ev.uri },
        update: {
          externalId: ev.externalId,
          title: ev.title,
          subtitle: ev.subtitle,
          category: ev.category,
          categoryBadge: ev.categoryBadge,
          dateLabel: ev.dateLabel,
          dayNum: ev.dayNum,
          monthShort: ev.monthShort,
          startDate: ev.startDate,
          timeInfo: ev.timeInfo,
          locationTitle: ev.locationTitle,
          locationSub: ev.locationSub,
          description: ev.description,
          descriptionHtml: ev.descriptionHtml,
          actionUrl: ev.actionUrl,
          sourceUrl: ev.sourceUrl,
          isSticky: ev.isSticky,
        },
        create: {
          uri: ev.uri,
          externalId: ev.externalId,
          title: ev.title,
          subtitle: ev.subtitle,
          category: ev.category,
          categoryBadge: ev.categoryBadge,
          dateLabel: ev.dateLabel,
          dayNum: ev.dayNum,
          monthShort: ev.monthShort,
          startDate: ev.startDate,
          timeInfo: ev.timeInfo,
          locationTitle: ev.locationTitle,
          locationSub: ev.locationSub,
          description: ev.description,
          descriptionHtml: ev.descriptionHtml,
          actionUrl: ev.actionUrl,
          sourceUrl: ev.sourceUrl,
          isSticky: ev.isSticky,
        },
      });
    }

    console.log(`[Events] Synced ${liveEvents.length} live events from adm.sute.edu.ua API.`);
    return liveEvents;
  } catch (error) {
    console.error('[Events] Error syncing SUTE events:', error);
    return [];
  }
}

export async function getEventsWithFallback(): Promise<ParsedSuteEvent[]> {
  try {
    const dbEvents = await prisma.universityEvent.findMany({
      orderBy: [{ startDate: 'asc' }, { updatedAt: 'desc' }],
      take: 20,
    });

    if (dbEvents.length > 0) {
      return dbEvents.map((e, idx) => ({
        id: e.uri.replace(/^\/events\//, '') || e.id,
        uri: e.uri,
        externalId: e.externalId || undefined,
        title: e.title,
        subtitle: e.subtitle,
        category: (e.category as 'study' | 'studlife' | 'opportunities') || 'studlife',
        categoryBadge: idx === 0 ? 'НАЙБЛИЖЧА ПОДІЯ · SUTE' : e.categoryBadge,
        dateLabel: e.dateLabel,
        dayNum: e.dayNum,
        monthShort: e.monthShort,
        startDate: e.startDate,
        timeInfo: e.timeInfo,
        locationTitle: e.locationTitle,
        locationSub: e.locationSub,
        description: e.description,
        descriptionHtml: e.descriptionHtml || undefined,
        actionUrl: e.actionUrl || undefined,
        sourceUrl: e.sourceUrl,
        isSticky: e.isSticky,
        isFeatured: idx === 0,
      }));
    }
  } catch {
    // DB might not be reachable or table empty, fallback to direct live API fetch
  }

  return fetchLiveSuteEvents();
}
