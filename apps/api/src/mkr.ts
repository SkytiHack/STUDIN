import axios from 'axios';
import NodeCache from 'node-cache';
// Note: If Prisma needed here in future, import from './prisma'

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

export const flushMkrCache = () => cache.flushAll();
const api = 'https://mia.mobil.knute.edu.ua';
const reqOpts = { 
  headers: { 
    'Content-Type': 'application/json', 
    'Accept-Language': 'uk',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  } 
};

const FACULTY_MAP: Record<string, string> = {
  'Факультет інформаційних технологій': 'ФІТ',
  'Факультет технологій та бізнесу': 'ФТБ',
  'Факультет економіки, менеджменту та психології': 'ФЕМП',
  'Факультет міжнародної торгівлі та права': 'ФМТП',
  'Факультет торгівлі та маркетингу': 'ФТМ',
  'Факультет фінансів та обліку': 'ФФО',
};

export async function getMkrStudents(facultyNameOrShort: string, course: number, groupName: string) {
  const cacheKey = `students_${groupName}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached as any[];

  // Map full name to short name if necessary
  const facultyShortName = FACULTY_MAP[facultyNameOrShort.trim()] || facultyNameOrShort.trim();

  try {
    // 1. Get structures
    let structId = cache.get('structId');
    if (!structId) {
      const structs = await axios.get(`${api}/list/structures`, reqOpts);
      structId = structs.data[0].id;
      cache.set('structId', structId, 86400);
    }

    // 2. Get faculties
    let faculties = cache.get('faculties') as any[];
    if (!faculties) {
      const res = await axios.post(`${api}/list/faculties`, { structureId: structId }, reqOpts);
      faculties = res.data;
      cache.set('faculties', faculties, 86400);
    }

    // Find matching faculty
    const fit = faculties.find((f: any) => f.shortName === facultyShortName || f.name === facultyShortName);
    if (!fit) return [];

    // 3. Get groups for this faculty & course
    const groupsCacheKey = `groups_${fit.id}_${course}`;
    let groups = cache.get(groupsCacheKey) as any[];
    if (!groups) {
      const res = await axios.post(`${api}/list/groups`, { facultyId: fit.id, course }, reqOpts);
      groups = res.data;
      cache.set(groupsCacheKey, groups, 86400);
    }

    const fitGroup = groups.find((g: any) => g.name === groupName || g.name?.trim() === groupName.trim());
    if (!fitGroup) return [];

    // 4. Get students
    const students = await axios.post(`${api}/list/students-by-group`, { groupId: fitGroup.id }, reqOpts);
    
    // Format to match our DB student structure somewhat
    const formattedStudents = students.data.map((s: any) => ({
      id: `mkr_${s.id}`,
      fullName: `${s.lastName} ${s.firstName} ${s.secondName}`.trim(),
      groupId: 'mkr', // placeholder
      isMkr: true
    }));

    cache.set(cacheKey, formattedStudents);
    return formattedStudents;
  } catch (error: any) {
    console.error('MKR API Error:', error.response?.data || error.message);
    return [];
  }
}
