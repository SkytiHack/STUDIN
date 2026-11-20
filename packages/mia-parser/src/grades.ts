import axios from 'axios';
import * as cheerio from 'cheerio';

export interface MiaGrade {
  subject: string;
  currentScore: number;
  maxScore: number;
  category: 'journal' | 'session' | 'overall';
}

export class MiaGradesProvider {
  private readonly baseUrl = 'https://mia1.knute.edu.ua';
  private readonly defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  };

  private mergeCookies(oldCookies: string[], newCookies: string[]): string {
    const map = new Map<string, string>();
    [...oldCookies, ...newCookies].forEach(c => {
      const pair = c.split(';')[0];
      const eqIdx = pair.indexOf('=');
      if (eqIdx > -1) {
        map.set(pair.substring(0, eqIdx).trim(), pair.substring(eqIdx + 1));
      }
    });
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async login(login: string, password: string): Promise<string> {
    if (!login || !password) throw new Error("Invalid credentials");
    
    // 1. Get CSRF token and initial cookies
    const loginPage = await axios.get(`${this.baseUrl}/login`, { headers: this.defaultHeaders });
    const cookies = loginPage.headers['set-cookie'] || [];
    const $ = cheerio.load(loginPage.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');

    if (!csrfToken) {
      throw new Error("Could not find CSRF token");
    }

    const cookieStr = this.mergeCookies(cookies, []);

    // 2. Perform login
    const params = new URLSearchParams();
    params.append('_csrf-frontend', csrfToken);
    params.append('LoginForm[username]', login);
    params.append('LoginForm[password]', password);
    params.append('LoginForm[rememberMe]', '1');

    const loginResponse = await axios.post(`${this.baseUrl}/login`, params.toString(), {
      headers: {
        ...this.defaultHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieStr,
        'Referer': `${this.baseUrl}/login`
      },
      maxRedirects: 0,
      validateStatus: status => status === 200 || status === 302
    });

    if (loginResponse.status === 302) {
      // Successful login redirects (usually to / or /profile)
      const authCookies = loginResponse.headers['set-cookie'] || [];
      return this.mergeCookies(cookies, authCookies);
    }
    
    // If we get here with 200 OK, it means login failed (invalid credentials)
    throw new Error("Invalid credentials");
  }

  
  async getSemesters(sessionToken: string): Promise<{id: string, name: string}[]> {
    if (!sessionToken) throw new Error("Unauthorized");
    const response = await axios.get(`${this.baseUrl}/self/exam-session`, {
      headers: {
        ...this.defaultHeaders,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'uk-UA,uk;q=0.9',
        'Cookie': sessionToken
      }
    });
    const $ = cheerio.load(response.data);
    const options = $('select[name="ExamSessionForm[semester]"] option');
    const semesters: {id: string, name: string}[] = [];
    options.each((i, el) => {
      const val = $(el).attr('value');
      const text = $(el).text().trim();
      if (val && val !== '') semesters.push({ id: val, name: text });
    });
    return semesters;
  }

  async getGrades(sessionToken: string, semesterId?: string): Promise<MiaGrade[]> {
    if (!sessionToken) throw new Error("Unauthorized");

    const response = await axios.get(`${this.baseUrl}/self/journal`, {
      headers: {
        ...this.defaultHeaders,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Referer': `${this.baseUrl}/`,
        'Cookie': sessionToken
      }
    });

    let $ = cheerio.load(response.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');
    const currentSemesterId = $('form[action="/self/journal"] select option[selected]').attr('value');
    const targetSemesterId = semesterId || currentSemesterId;

    if (semesterId) {
      const journalParams = new URLSearchParams();
      journalParams.append('_csrf-frontend', csrfToken || '');
      const selectName = $('form[action="/self/journal"] select').attr('name') || 'JournalForm[semester]';
      journalParams.append(selectName, semesterId);
      
      const postJournal = await axios.post(`${this.baseUrl}/self/journal`, journalParams.toString(), {
        headers: {
          ...this.defaultHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': sessionToken,
          'Referer': `${this.baseUrl}/self/journal`
        },
        validateStatus: s => s < 400
      });
      $ = cheerio.load(postJournal.data);
    }
    
    // Check if we were redirected to the login page (session expired/invalid)
    if ($('title').text().includes('Вхід') || response.request?.res?.responseUrl?.includes('/login')) {
      throw new Error("MIA Session Expired");
    }

    const grades: MiaGrade[] = [];
    const seenBaseSubjects = new Set<string>();

    $('.accordion > .card').each((i, card) => {
      const titleText = $(card).find('.card-header button').text().trim();
      if (!titleText) return;

      const subject = titleText;
      const subjectBaseMatch = titleText.match(/^(.*?)\[(.*?)\]/);
      const baseSubject = subjectBaseMatch ? subjectBaseMatch[1].trim() : titleText;

      const tables = $(card).find('table');
      if (tables.length > 1) {
        const totalTable = $(tables[1]);
        const headerCells = totalTable.find('thead th');
        const dataCells = totalTable.find('tbody td');

        if (dataCells.length > 0) {
          const semesterScoreStr = $(dataCells[0]).text().trim();
          const examScoreStr = $(dataCells[3]).text().trim();
          const overallScoreStr = $(dataCells[4]).text().trim();

          const semesterScore = parseFloat(semesterScoreStr) || 0;
          const examScore = parseFloat(examScoreStr) || 0;
          const overallScore = parseFloat(overallScoreStr) || 0;
          const examLabel = $(headerCells[3]).text().trim().toLowerCase();
          
          const isZalik = examLabel === 'залік';

          grades.push({
            subject: subject,
            currentScore: semesterScore,
            maxScore: isZalik ? 100 : 60,
            category: 'journal'
          });

          if (!seenBaseSubjects.has(baseSubject)) {
            seenBaseSubjects.add(baseSubject);
          }
          return;
        }
      }
      
      // Fallback: if no valid grades table is found, still show the subject with 0 points
      grades.push({ subject: subject, currentScore: 0, maxScore: 60, category: 'journal' });
      
      if (!seenBaseSubjects.has(baseSubject)) {
        seenBaseSubjects.add(baseSubject);
      }
    });

    // Fetch Exam Sessions
    try {
      let examResponse = await axios.get(`${this.baseUrl}/self/exam-session`, {
        headers: {
          ...this.defaultHeaders,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'uk-UA,uk;q=0.9',
          'Cookie': sessionToken
        }
      });
      let $exam = cheerio.load(examResponse.data);

      if (semesterId) {
        const examParams = new URLSearchParams();
        examParams.append('_csrf-frontend', csrfToken || '');
        const examSelectName = $exam('form[action="/self/exam-session"] select').attr('name') || 'ExamSessionForm[semester]';
        examParams.append(examSelectName, semesterId);
        
        const postExam = await axios.post(`${this.baseUrl}/self/exam-session`, examParams.toString(), {
          headers: {
            ...this.defaultHeaders,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': sessionToken,
            'Referer': `${this.baseUrl}/self/exam-session`
          },
          validateStatus: s => s < 400
        });
        $exam = cheerio.load(postExam.data);
      }

      $exam('#w2 table tbody tr').each((i, row) => {
        const tds = $exam(row).find('td');
        if (tds.length >= 8) {
          const type = $exam(tds[1]).text().trim();
          const subject = $exam(tds[2]).text().trim();
          const scoreStr = $exam(tds[7]).text().trim();
          const score = parseFloat(scoreStr) || 0;
          const isZalik = type.toLowerCase().includes('залік');
          
          grades.push({
            subject: subject,
            currentScore: score,
            maxScore: isZalik ? 100 : 40,
            category: 'session'
          });
        }
      });
    } catch (e) {
      console.error('Failed to fetch exam session', e);
    }

    // Fetch Overall Performance
    try {
      const overallResponse = await axios.get(`${this.baseUrl}/self/overall-performance`, {
        headers: {
          ...this.defaultHeaders,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'uk-UA,uk;q=0.9',
          'Cookie': sessionToken
        }
      });
      const $overall = cheerio.load(overallResponse.data);
      $overall('#studentCardProgress tbody tr').each((i, row) => {
        const tds = $overall(row).find('td');
        if (tds.length >= 8) {
          const rowSemId = $overall(row).attr('data-sem');
          if (targetSemesterId && rowSemId !== targetSemesterId) return;

          const subject = $overall(tds[1]).text().trim();
          const scoreStr = $overall(tds[6]).text().trim();
          const score = parseFloat(scoreStr) || 0;
          
          if (subject) {
            grades.push({
              subject: subject,
              currentScore: score,
              maxScore: 100,
              category: 'overall'
            });
          }
        }
      });
    } catch (e) {
      console.error('Failed to fetch overall performance', e);
    }

    return grades;
  }
}
