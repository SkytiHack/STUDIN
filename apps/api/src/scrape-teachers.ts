import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const PAGE_URL = 'https://knute.edu.ua';

interface Teacher {
  name: string;
  page_link: string;
}

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getFaculties(client: import('axios').AxiosInstance): Promise<{name: string, chairs: {name: string, link: string}[]}[]> {
  const { data } = await client.get(PAGE_URL);
  const $ = cheerio.load(data);
  
  const navBar = $('ul.nav');
  if (!navBar.length) throw new Error('Navigation bar not found');
  
  const chairsDropdown = navBar.find('span.short-menu-item').filter((i, el) => $(el).text().trim() === 'Факультети кафедри');
  if (!chairsDropdown.length) throw new Error('Chairs dropdown not found');
  
  const chairsList = chairsDropdown.parent().parent().find('ul.dropdown-menu').children();
  
  const faculties: {name: string, chairs: {name: string, link: string}[]}[] = [];
  let currentFaculty: any = null;
  
  chairsList.each((i, el) => {
    const facultyEl = $(el).find('span');
    if (facultyEl.length) {
      currentFaculty = { name: facultyEl.text().trim(), chairs: [] };
      faculties.push(currentFaculty);
      return;
    }
    
    const aEl = $(el).find('a');
    if (aEl.length && currentFaculty) {
      currentFaculty.chairs.push({
        name: aEl.text().trim(),
        link: new URL(aEl.attr('href') || '', PAGE_URL).toString()
      });
    }
  });
  
  return faculties;
}

async function getTeachers(client: import('axios').AxiosInstance, chairUrl: string): Promise<Teacher[]> {
  try {
    const { data } = await client.get(chairUrl);
    const $ = cheerio.load(data);
    
    // Find the link to teachers composition
    const linkEl = $('a.trix-top-menu-item-hrf').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('склад') || text.includes('виклад');
    });
    
    if (!linkEl.length) return [];
    
    const teachersUrl = new URL(linkEl.attr('href') || '', PAGE_URL).toString();
    
    // Fetch teachers page
    const { data: tData } = await client.get(teachersUrl);
    const $t = cheerio.load(tData);
    
    const teachers: Teacher[] = [];
    
    $t('tbody td').each((i, cell) => {
      const a = $t(cell).find('a');
      const img = $t(cell).find('img');
      
      if (!a.length || !img.length) return;
      
      let name = '';
      a.each((j, aEl) => {
        let n = $t(aEl).text().replace(/\s+/g, ' ').trim();
        if (n.split(' ').length === 3) {
          name = n;
        }
      });
      
      if (!name) {
        let n = $t(a.first().parent()).text().replace(/\s+/g, ' ').trim();
        if (n.split(' ').length === 3) {
          name = n;
        }
      }
      
      if (!name) return;
      
      // Normalize name casing
      name = name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
      
      const link = new URL(a.first().attr('href') || '', PAGE_URL).toString();
      
      teachers.push({
        name,
        page_link: link
      });
    });
    
    return teachers;
  } catch (error: any) {
    console.error(`Error scraping ${chairUrl}: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('Starting KNUTE teachers scrape...');
  const client = axios.create({ timeout: 15000 });
  
  try {
    const faculties = await getFaculties(client);
    console.log(`Found ${faculties.length} faculties`);
    
    const allTeachers: Teacher[] = [];
    let count = 0;
    
    for (const faculty of faculties) {
      for (const chair of faculty.chairs) {
        console.log(`Scraping chair: ${chair.name}...`);
        const teachers = await getTeachers(client, chair.link);
        allTeachers.push(...teachers);
        count++;
        await timeout(500); // polite delay
      }
    }
    
    const dict: Record<string, string> = {};
    for (const t of allTeachers) {
      dict[t.name.toLowerCase()] = t.page_link;
    }
    
    const outPath = path.join(__dirname, '..', '..', 'web', 'src', 'assets', 'teachers.json');
    
    // Ensure dir exists
    if (!fs.existsSync(path.dirname(outPath))) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }
    
    fs.writeFileSync(outPath, JSON.stringify(dict, null, 2));
    
    console.log(`Successfully saved ${Object.keys(dict).length} teachers to ${outPath}`);
  } catch (error) {
    console.error('Scrape failed:', error);
  }
}

main();
