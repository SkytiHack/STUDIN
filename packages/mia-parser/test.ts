import { MiaDteuProvider } from './src/index';

async function test() {
  const provider = new MiaDteuProvider();
  
  const faculties = await provider.getFaculties();
  if (faculties.length > 0) {
    const fId = faculties[0].id;
    const courses = await provider.getCourses(fId);
    if (courses.length > 0) {
      const cId = courses[0].id;
      const groups = await provider.getGroups(fId, cId);
      if (groups.length > 0) {
        const gId = groups[0].id;
        console.log(`Fetching schedule for group ${gId}...`);
        const schedule = await provider.getSchedule(fId, cId, gId, '24.08.2026');
        console.log(`Found ${schedule.length} lessons`);
        console.log(JSON.stringify(schedule, null, 2));
      }
    }
  }
}

test().catch(console.error);
