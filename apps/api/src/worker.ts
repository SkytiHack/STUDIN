import cron from 'node-cron';
import { prisma, disconnectPrisma } from './prisma';
import { MiaDteuProvider } from '@dteu-schedule/mia-parser';
import { detectChanges, saveChanges } from './diff';

const provider = new MiaDteuProvider();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncAll() {
  const startTime = Date.now();
  console.log('[Worker] Starting full schedule synchronization...');
  
  try {
    const faculties = await provider.getFaculties();
    console.log(`[Worker] Found ${faculties.length} faculties.`);
    
    // Fast-pass: upsert all faculties, courses, and groups immediately
    for (const f of faculties) {
      const dbFaculty = await prisma.faculty.upsert({
        where: { externalId: f.id },
        update: { name: f.name },
        create: { externalId: f.id, name: f.name }
      });
      
      try {
        const courses = await provider.getCourses(f.id);
        for (const c of courses) {
          const courseNum = parseInt(c.id);
          const groups = await provider.getGroups(f.id, c.id);
          
          for (const g of groups) {
            await prisma.group.upsert({
              where: { externalId: g.id },
              update: { name: g.name, course: courseNum, facultyId: dbFaculty.id },
              create: { externalId: g.id, name: g.name, course: courseNum, facultyId: dbFaculty.id }
            });
          }
        }
      } catch (e) {
        console.error(`[Worker] Failed to sync groups for faculty ${f.name}:`, e);
      }
    }
    
    const structureTime = Date.now() - startTime;
    console.log(`[Worker] Fast-pass structure sync complete in ${structureTime}ms. Starting schedule deep-scraping...`);
    
    let totalScheduleItems = 0;
    let totalChanges = 0;

    // Slow-pass: deep scraping for schedules
    for (const f of faculties) {
      const dbFaculty = await prisma.faculty.findUnique({ where: { externalId: f.id }});
      if (!dbFaculty) continue;
      
      try {
        const courses = await provider.getCourses(f.id);
        for (const c of courses) {
          const groups = await provider.getGroups(f.id, c.id);
          
          for (const g of groups) {
            const dbGroup = await prisma.group.findUnique({ where: { externalId: g.id }});
            if (!dbGroup) continue;
            
            // Protect MKR API from DDOS by our own scraper (prevents Railway IP ban)
            await sleep(300);
            
            // Use today's date dynamically
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const todayStr = `${dd}.${mm}.${yyyy}`;
            
            try {
              // Fetch 30 days to ensure we get enough of the upcoming semester
              const scheduleItems = await provider.getSchedule(f.id, c.id, g.id, todayStr, 30);
              
              if (scheduleItems.length > 0) {
                totalScheduleItems += scheduleItems.length;
                const dateStrings = [...new Set(scheduleItems.map((s: any) => s.date))] as string[];
                
                // Process each date with diff detection
                for (const d of dateStrings) {
                  const [day, month, year] = d.split('.');
                  const dateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);
                  
                  // Get old items for diff comparison
                  const oldItems = await prisma.scheduleItem.findMany({
                    where: { groupId: dbGroup.id, date: dateObj }
                  });
                  
                  const newItemsForDate = scheduleItems
                    .filter((s: any) => s.date === d)
                    .map((item: any) => ({
                      lessonNumber: item.lessonNumber,
                      subject: item.subject,
                      teacher: item.teacher,
                      classroom: item.classroom,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      type: item.type,
                      annotation: item.annotation
                    }));
                  
                  // Detect changes
                  if (oldItems.length > 0) {
                    const changes = detectChanges(
                      oldItems.map(i => ({
                        lessonNumber: i.lessonNumber,
                        subject: i.subject,
                        teacher: i.teacher,
                        classroom: i.classroom,
                        startTime: i.startTime,
                        endTime: i.endTime,
                        type: i.type,
                        annotation: i.annotation
                      })),
                      newItemsForDate
                    );
                    
                    if (changes.length > 0) {
                      totalChanges += changes.length;
                      await saveChanges(dbGroup.id, dateObj, changes);
                      console.log(`[Worker] ${changes.length} changes detected for ${dbGroup.name} on ${d}`);
                    }
                  }
                  
                  // Use transaction for atomic delete + insert
                  await prisma.$transaction([
                    prisma.scheduleItem.deleteMany({
                      where: { groupId: dbGroup.id, date: dateObj }
                    }),
                    prisma.scheduleItem.createMany({
                      data: newItemsForDate.map((item: any) => ({
                        date: dateObj,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        lessonNumber: item.lessonNumber,
                        subject: item.subject,
                        teacher: item.teacher,
                        classroom: item.classroom,
                        type: item.type,
                        annotation: item.annotation,
                        groupId: dbGroup.id
                      })),
                      skipDuplicates: true
                    })
                  ]);
                }
              }
            } catch (e) {
              console.error(`[Worker] Failed to sync schedule for group ${dbGroup.name}:`, e);
            }
          }
        }
      } catch (e) {
        console.error(`[Worker] Failed to sync schedule for faculty ${f.name}:`, e);
      }
    }
    
    // Cleanup old schedule data (older than 60 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    const deletedOld = await prisma.scheduleItem.deleteMany({
      where: { date: { lt: cutoffDate } }
    });
    if (deletedOld.count > 0) {
      console.log(`[Worker] Cleaned up ${deletedOld.count} old schedule items.`);
    }

    // Cleanup old changes (older than 30 days)
    const changesCutoff = new Date();
    changesCutoff.setDate(changesCutoff.getDate() - 30);
    await prisma.scheduleChange.deleteMany({
      where: { createdAt: { lt: changesCutoff } }
    });
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Worker] Synchronization completed in ${totalTime}s. Items: ${totalScheduleItems}, Changes detected: ${totalChanges}`);
  } catch (error) {
    console.error('[Worker] Synchronization failed:', error);
  }
}

// Run every night at 03:00 AM
cron.schedule('0 3 * * *', () => {
  syncAll();
}, { timezone: 'Europe/Kyiv' });

// Run once immediately on start if specified
if (process.argv.includes('--run-now')) {
  syncAll();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, shutting down...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...');
  await disconnectPrisma();
  process.exit(0);
});

export async function syncSingleGroup(groupId: string) {
  const dbGroup = await prisma.group.findUnique({
    where: { id: groupId },
    include: { faculty: true }
  });
  if (!dbGroup) return;

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const todayStr = `${dd}.${mm}.${yyyy}`;

  try {
    const scheduleItems = await provider.getSchedule(
      dbGroup.faculty.externalId, 
      dbGroup.course.toString(), 
      dbGroup.externalId, 
      todayStr, 
      30
    );

    if (scheduleItems.length > 0) {
      const dateStrings = [...new Set(scheduleItems.map((s: any) => s.date))] as string[];

      for (const d of dateStrings) {
        const [day, month, year] = d.split('.');
        const dateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);

        const oldItems = await prisma.scheduleItem.findMany({
          where: { groupId: dbGroup.id, date: dateObj }
        });

        const newItemsForDate = scheduleItems
          .filter((s: any) => s.date === d)
          .map((item: any) => ({
            lessonNumber: item.lessonNumber,
            subject: item.subject,
            teacher: item.teacher,
            classroom: item.classroom,
            startTime: item.startTime,
            endTime: item.endTime,
            type: item.type,
            annotation: item.annotation
          }));

        if (oldItems.length > 0) {
          const changes = detectChanges(
            oldItems.map(i => ({
              lessonNumber: i.lessonNumber,
              subject: i.subject,
              teacher: i.teacher,
              classroom: i.classroom,
              startTime: i.startTime,
              endTime: i.endTime,
              type: i.type,
              annotation: i.annotation
            })),
            newItemsForDate
          );

          if (changes.length > 0) {
            await saveChanges(dbGroup.id, dateObj, changes);
          }
        }

        await prisma.$transaction([
          prisma.scheduleItem.deleteMany({
            where: { groupId: dbGroup.id, date: dateObj }
          }),
          prisma.scheduleItem.createMany({
            data: newItemsForDate.map((item: any) => ({
              date: dateObj,
              startTime: item.startTime,
              endTime: item.endTime,
              lessonNumber: item.lessonNumber,
              subject: item.subject,
              teacher: item.teacher,
              classroom: item.classroom,
              type: item.type,
              annotation: item.annotation,
              groupId: dbGroup.id
            })),
            skipDuplicates: true
          })
        ]);
      }
    }
    
    // Update lastSyncedAt
    await prisma.group.update({
      where: { id: dbGroup.id },
      data: { lastSyncedAt: new Date() }
    });
    
  } catch (e) {
    console.error(`[Worker] Failed to instant-sync schedule for group ${dbGroup.name}:`, e);
  }
}


console.log('[Worker] Cron job scheduled. Waiting for next tick...');
