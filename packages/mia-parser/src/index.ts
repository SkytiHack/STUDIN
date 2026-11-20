import axios, { AxiosInstance } from 'axios';

export interface Faculty { id: string; name: string; }
export interface Course { id: string; name: string; }
export interface Group { id: string; name: string; }
export * from './grades';
export interface ScheduleItem {
  date: string;
  startTime: string;
  endTime: string;
  lessonNumber: number;
  subject: string;
  teacher: string | null;
  classroom: string | null;
  type: string;
  annotation: string | null;
}

export class MiaDteuProvider {
  private client: AxiosInstance;

  constructor(private baseUrl: string = 'https://mia.mobil.knute.edu.ua') {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'uk',
        'Content-Type': 'application/json'
      },
    });
  }

  async getFaculties(): Promise<Faculty[]> {
    const res = await this.client.post('/list/faculties', { structureId: 0 });
    const data = res.data;
    if (!Array.isArray(data)) return [];
    
    return data.map((f: any) => ({
      id: f.id.toString(),
      name: f.fullName || f.shortName || 'Unknown Faculty'
    }));
  }

  async getCourses(facultyId: string): Promise<Course[]> {
    const res = await this.client.post('/list/courses', { facultyId: parseInt(facultyId, 10) });
    const data = res.data;
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      id: c.course.toString(),
      name: c.course.toString()
    }));
  }

  async getGroups(facultyId: string, course: string): Promise<Group[]> {
    const res = await this.client.post('/list/groups', { 
      facultyId: parseInt(facultyId, 10), 
      course: parseInt(course, 10) 
    });
    const data = res.data;
    if (!Array.isArray(data)) return [];

    return data.map((g: any) => ({
      id: g.id.toString(),
      name: g.name
    }));
  }

  async getSchedule(facultyId: string, course: string, groupId: string, dateStart: string, days: number = 5): Promise<ScheduleItem[]> {
    // Generate dateEnd based on dateStart and days
    // Note: dateStart is expected to be in DD.MM.YYYY format (from old HTML parser convention) or YYYY-MM-DD
    let startDate: Date;
    if (dateStart.includes('.')) {
      const [day, month, year] = dateStart.split('.');
      startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      startDate = new Date(dateStart);
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);
    
    // Format to YYYY-MM-DD for JSON API
    const formatYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateStartApi = formatYMD(startDate);
    const dateEndApi = formatYMD(endDate);

    const res = await this.client.post('/time-table/group', {
      groupId: parseInt(groupId, 10),
      dateStart: dateStartApi,
      dateEnd: dateEndApi
    });

    const data = res.data;
    if (!Array.isArray(data)) return [];

    const schedule: ScheduleItem[] = [];

    // Parse format: [{date: "2024-09-03", lessons: [{number: 1, periods: [{...}]}]}]
    for (const day of data) {
      if (!day.date || !Array.isArray(day.lessons)) continue;
      
      // Convert YYYY-MM-DD back to DD.MM.YYYY for consistency with existing DB schemas
      const [y, m, d] = day.date.split('-');
      const formattedDate = `${d}.${m}.${y}`;

      // We'll use a Map to merge subgroups for the same lesson and type
      // Key: `${lesson.number}-${type}`
      const mergedPeriods = new Map<string, ScheduleItem>();

      for (const lesson of day.lessons) {
        if (!Array.isArray(lesson.periods)) continue;
        
        for (const period of lesson.periods) {
          let type = 'other';
          const typeStr = (period.typeStr || '').toLowerCase();
          
          if (typeStr.includes('лек') || typeStr.includes('лєк') || typeStr.includes('лк')) type = 'lecture';
          else if (typeStr.includes('пр') || typeStr.includes('прак') || typeStr.includes('пз')) type = 'practice';
          else if (typeStr.includes('лаб') || typeStr.includes('лб')) type = 'lab';

          const subject = period.disciplineFullName || period.disciplineShortName || period.discipline || period.title || period.name || 'Unknown Subject';
          let teacher = period.teachersNameFull || period.teachersName || null;
          let classroom = period.classroom || null;
          let annotation = period.notice || period.info || null;

          const key = `${lesson.number}-${type}`;
          if (mergedPeriods.has(key)) {
            const existing = mergedPeriods.get(key)!;
            
            // Merge teachers if different
            if (teacher && existing.teacher && !existing.teacher.includes(teacher)) {
              existing.teacher = `${existing.teacher} / ${teacher}`;
            } else if (teacher && !existing.teacher) {
              existing.teacher = teacher;
            }

            // Merge classrooms if different
            if (classroom && existing.classroom && !existing.classroom.includes(classroom)) {
              existing.classroom = `${existing.classroom} / ${classroom}`;
            } else if (classroom && !existing.classroom) {
              existing.classroom = classroom;
            }

            // Merge annotations if different
            if (annotation && existing.annotation && !existing.annotation.includes(annotation)) {
              existing.annotation = `${existing.annotation} / ${annotation}`;
            } else if (annotation && !existing.annotation) {
              existing.annotation = annotation;
            }
            
            // If the existing subject is "Unknown Subject" but the new one is not, update it
            if (existing.subject === 'Unknown Subject' && subject !== 'Unknown Subject') {
              existing.subject = subject;
            }
          } else {
            mergedPeriods.set(key, {
              date: formattedDate,
              startTime: period.timeStart,
              endTime: period.timeEnd,
              lessonNumber: lesson.number,
              subject,
              teacher,
              classroom,
              type,
              annotation
            });
          }
        }
      }

      // Add all merged periods for this day to the schedule
      for (const mergedItem of mergedPeriods.values()) {
        schedule.push(mergedItem);
      }
    }

    return schedule;
  }
}
