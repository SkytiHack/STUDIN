import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";
import compression from "compression";
import { prisma, disconnectPrisma } from "./prisma";
import { syncAll, syncSingleGroup } from "./worker";
import { getMkrStudents, flushMkrCache } from "./mkr";
import { MiaDteuProvider } from '@dteu-schedule/mia-parser';
import { generateIcsCalendar } from './ics';
import { getEventsWithFallback, syncEventsToDb } from './events';

const app = express();
const port = process.env.PORT || 3001;
const provider = new MiaDteuProvider();
const apiCache = new NodeCache({ stdTTL: 300 }); // Default 5 minutes

// Security
app.use(helmet());
app.use(compression());

// CORS — restrict to specific origins
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Still allow but could be restricted in production
    }
  }
}));
app.use(express.json());

// Activity Tracking Middleware
app.use(async (req, res, next) => {
  next(); // Non-blocking
  const tgIdStr = req.headers['x-telegram-id'] as string;
  if (!tgIdStr) return;
  
  try {
    const tgId = BigInt(tgIdStr);
    await prisma.user.updateMany({
      where: { telegramId: tgId },
      data: { lastSeenAt: new Date() }
    });
    
    const today = new Date();
    const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    const user = await prisma.user.findUnique({ where: { telegramId: tgId } });
    if (user) {
      await prisma.dailyActivity.upsert({
        where: { telegramId_date: { telegramId: tgId, date: dateOnly } },
        update: {},
        create: { telegramId: tgId, date: dateOnly }
      });
    }
  } catch (e) {
    console.error('[Activity] Error tracking:', e);
  }
});

// DDOS protection: limit each IP to 200 requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 200, 
  message: { error: "Забагато запитів, спробуйте пізніше" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Cache middleware to prevent DB overload
const cacheMiddleware = (durationSecs: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'GET') return next();
    
    const key = req.originalUrl;
    const cached = apiCache.get(key);
    
    if (cached) {
      return res.json(cached);
    }
    
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && !body?.error) {
        apiCache.set(key, body, durationSecs);
      }
      return originalJson(body);
    };
    next();
  };
};

// Auth middleware for admin endpoints
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secret = (req.query.secret || req.headers['x-admin-secret']) as string;
  const expectedSecret = process.env.ADMIN_SECRET || 'secret123';
  if (!secret || secret !== expectedSecret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// ==================== HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ==================== SUTE EVENTS (JSON API SYNC) ====================

app.get("/api/events", cacheMiddleware(300), async (req, res) => {
  try {
    const events = await getEventsWithFallback();
    res.json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    res.status(500).json({ error: "Failed to fetch university events" });
  }
});

app.post("/api/events/sync", async (req, res) => {
  try {
    const events = await syncEventsToDb();
    apiCache.del("/api/events");
    res.json({ success: true, count: events.length, events });
  } catch (error) {
    console.error("Failed to sync events:", error);
    res.status(500).json({ error: "Failed to sync events" });
  }
});

// ==================== SYNC (Protected) ====================

app.get("/api/sync", requireAdmin, async (req, res) => {
  apiCache.flushAll();
  flushMkrCache();
  res.json({ message: "Sync started in background. Caches flushed." });
  
  syncAll().then(() => {
    apiCache.flushAll();
    flushMkrCache();
    console.log("Post-sync cache flush completed");
  }).catch(console.error);
});

// ==================== FACULTIES / COURSES / GROUPS ====================

// Get all faculties (Cache for 1 hour)
app.get("/api/faculties", cacheMiddleware(3600), async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(faculties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch faculties" });
  }
});

// Get courses by faculty (Cache for 1 hour)
app.get("/api/courses", cacheMiddleware(3600), async (req, res) => {
  const facultyId = req.query.facultyId as string;
  if (!facultyId) return res.status(400).json({ error: "facultyId required" });
  
  try {
    const courses = await prisma.group.findMany({
      where: { facultyId },
      select: { course: true },
      distinct: ['course'],
      orderBy: { course: 'asc' }
    });
    res.json(courses.map(c => ({ id: c.course.toString(), name: c.course.toString() })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Get groups by faculty and course (Cache for 1 hour)
app.get("/api/groups", cacheMiddleware(3600), async (req, res) => {
  const facultyId = req.query.facultyId as string;
  const course = req.query.course as string;
  if (!facultyId || !course) return res.status(400).json({ error: "facultyId and course required" });
  
  try {
    const groups = await prisma.group.findMany({
      where: { 
        facultyId,
        course: parseInt(course)
      }
    });
    
    // Natural sort: "ФІТ 2-2" comes before "ФІТ 2-10"
    groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// ==================== STUDENTS ====================

// Get students for a group (Cache for 5 mins)
app.get("/api/groups/students", cacheMiddleware(300), async (req, res) => {
  const groupId = req.query.groupId as string;
  if (!groupId) return res.status(400).json({ error: "groupId required" });
  
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { faculty: true }
    });
    
    let dbStudents = await prisma.student.findMany({
      where: { groupId },
      orderBy: { fullName: 'asc' },
      include: { user: { select: { id: true } } }
    });
    
    if (!group) {
      return res.json(dbStudents);
    }
    
    // Fetch MKR students
    const mkrStudents = await getMkrStudents(group.faculty.shortName || group.faculty.name, group.course, group.name);
    
    // Sort alphabetically
    mkrStudents.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
    
    res.json(mkrStudents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Export students to CSV
app.get("/api/groups/students/export", async (req, res) => {
  const groupId = req.query.groupId as string;
  if (!groupId) return res.status(400).send("groupId required");
  
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { faculty: true }
    });
    
    if (!group) return res.status(404).send("Group not found");
    
    const students = await getMkrStudents(group.faculty.shortName || group.faculty.name, group.course, group.name);
    if (!students || students.length === 0) return res.status(404).send("No students found");

    const bom = '\uFEFF';
    let csvContent = "№;ПІБ;;;Підгрупа\n";
    students.forEach((s: any, i: number) => {
      const parts = s.fullName.toLowerCase().trim().split(/\s+/);
      const index = students.findIndex((st: any) => parts.every((p: string) => st.fullName.toLowerCase().includes(p)));
      const mid = Math.ceil(students.length / 2);
      const sub = index < mid ? 1 : 2;
      csvContent += `"${i + 1}";"${s.fullName}";"";"";""${sub}"\n`;
    });

    const buffer = Buffer.from(bom + csvContent, 'utf-8');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Length', buffer.length.toString());
    const encodedName = encodeURIComponent(group.name);
    res.setHeader('Content-Disposition', `attachment; filename="Students.csv"; filename*=UTF-8''Students_${encodedName}.csv`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to export students");
  }
});

// ==================== SCHEDULE ====================

// Get schedule for a group (from DB only — worker keeps it updated)
app.get("/api/schedule", cacheMiddleware(300), async (req, res) => {
  const groupId = req.query.groupId as string;
  const dateStr = req.query.date as string;
  
  if (!groupId) return res.status(400).json({ error: "groupId required" });
  
  try {
    // Build query
    const whereClause: any = { groupId };
    if (dateStr) {
      const [day, month, year] = dateStr.split('.');
      if (day && month && year) {
         whereClause.date = new Date(`${year}-${month}-${day}T00:00:00Z`);
      }
    }
    
    const schedule = await prisma.scheduleItem.findMany({
      where: whereClause,
      orderBy: [
        { date: 'asc' },
        { lessonNumber: 'asc' }
      ]
    });

    // If no schedule in DB, try live fetch as fallback
    if (schedule.length === 0) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { faculty: true }
      });

      if (group) {
        let fetchDate = dateStr;
        if (!fetchDate) {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();
          fetchDate = `${dd}.${mm}.${yyyy}`;
        }
        
        try {
          const scheduleItems = await provider.getSchedule(
            group.faculty.externalId, 
            group.course.toString(), 
            group.externalId, 
            fetchDate, 
            30
          );

          if (scheduleItems.length > 0) {
            const dateStrings = [...new Set(scheduleItems.map((s: any) => s.date))] as string[];
            
            for (const d of dateStrings) {
              const [day, month, year] = d.split('.');
              const dateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);
              
              await prisma.scheduleItem.deleteMany({
                where: { groupId: group.id, date: dateObj }
              });
            }
            
            await prisma.scheduleItem.createMany({
              data: scheduleItems.map((item: any) => {
                const [day, month, year] = item.date.split('.');
                const dateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);
                return {
                  date: dateObj,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  lessonNumber: item.lessonNumber,
                  subject: item.subject,
                  teacher: item.teacher,
                  classroom: item.classroom,
                  type: item.type,
                  annotation: item.annotation,
                  groupId: group.id
                };
              }),
              skipDuplicates: true
            });

            // Return freshly fetched data
            const freshSchedule = await prisma.scheduleItem.findMany({
              where: whereClause,
              orderBy: [{ date: 'asc' }, { lessonNumber: 'asc' }]
            });
            return res.json(freshSchedule);
          }
        } catch (e) {
          console.error("Failed to fetch live schedule from provider:", e);
        }
      }
    }

    res.json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// ==================== ICS EXPORT ====================

app.get("/api/schedule/export/ics", async (req, res) => {
  const groupId = req.query.groupId as string;
  if (!groupId) return res.status(400).send("groupId required");

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).send("Group not found");

    const schedule = await prisma.scheduleItem.findMany({
      where: { groupId },
      orderBy: [{ date: 'asc' }, { lessonNumber: 'asc' }]
    });

    if (schedule.length === 0) return res.status(404).send("No schedule found");

    const events = schedule.map(item => ({
      subject: item.subject,
      teacher: item.teacher,
      classroom: item.classroom,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type
    }));

    const icsContent = generateIcsCalendar(events, `Розклад — ${group.name}`);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    const encodedName = encodeURIComponent(group.name);
    res.setHeader('Content-Disposition', `attachment; filename="schedule.ics"; filename*=UTF-8''Schedule_${encodedName}.ics`);
    res.send(icsContent);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to export schedule");
  }
});

// ==================== SEARCH ====================

app.get("/api/search", cacheMiddleware(300), async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) return res.status(400).json({ error: "Query too short (min 2 chars)" });

  try {
    const results = await prisma.scheduleItem.findMany({
      where: {
        OR: [
          { subject: { contains: q, mode: 'insensitive' } },
          { teacher: { contains: q, mode: 'insensitive' } },
        ]
      },
      include: { group: true },
      orderBy: { date: 'asc' },
      take: 50
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search failed" });
  }
});

// ==================== TEACHERS ====================

app.get("/api/teachers", cacheMiddleware(3600), async (req, res) => {
  try {
    const teachers = await prisma.scheduleItem.findMany({
      where: { teacher: { not: null } },
      select: { teacher: true },
      distinct: ['teacher'],
      orderBy: { teacher: 'asc' }
    });
    res.json(teachers.map(t => t.teacher).filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

app.get("/api/schedule/teacher", cacheMiddleware(300), async (req, res) => {
  const teacherName = req.query.teacher as string;
  if (!teacherName) return res.status(400).json({ error: "teacher name required" });

  try {
    const schedule = await prisma.scheduleItem.findMany({
      where: { teacher: { contains: teacherName, mode: 'insensitive' } },
      include: { group: true },
      orderBy: [{ date: 'asc' }, { lessonNumber: 'asc' }]
    });
    res.json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teacher schedule" });
  }
});

// ==================== SCHEDULE CHANGES ====================

app.get("/api/schedule/changes", cacheMiddleware(60), async (req, res) => {
  const groupId = req.query.groupId as string;
  if (!groupId) return res.status(400).json({ error: "groupId required" });

  try {
    const changes = await prisma.scheduleChange.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(changes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch changes" });
  }
});

// ==================== USER MANAGEMENT ====================

// Save user onboarding
app.post("/api/users/student", async (req, res) => {
  const { telegramId, groupId, fullName } = req.body;
  if (!groupId || !fullName) return res.status(400).json({ error: "groupId and fullName required" });
  
  try {
    let student = await prisma.student.findFirst({
       where: { fullName, groupId }
    });
    
    if (!student) {
       student = await prisma.student.create({
          data: { fullName, groupId }
       });
    }
    
    if (telegramId) {
      const user = await prisma.user.upsert({
         where: { telegramId: BigInt(telegramId) },
         update: { 
           studentId: student.id,
           ...(req.body.subgroup !== undefined && { preferences: { subgroup: req.body.subgroup } })
         },
         create: { 
           telegramId: BigInt(telegramId), 
           studentId: student.id,
           ...(req.body.subgroup !== undefined && { preferences: { subgroup: req.body.subgroup } })
         }
      });
      return res.json({ success: true, user: { ...user, telegramId: user.telegramId?.toString() }, student });
    }
    
    res.json({ success: true, student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save user" });
  }
});
// ==================== MIA GRADES ====================

import { MiaGradesProvider } from '@dteu-schedule/mia-parser';
const gradesProvider = new MiaGradesProvider();

app.post("/api/mia/login", async (req, res) => {
  const { telegramId, login, password } = req.body;
  if (!telegramId || !login || !password) {
    return res.status(400).json({ error: "telegramId, login, and password required" });
  }

  try {
    const token = await gradesProvider.login(login, password);
    // TODO: Encrypt token before saving
      await prisma.user.upsert({
        where: { telegramId: BigInt(telegramId) },
        update: { miaSessionToken: token },
        create: { telegramId: BigInt(telegramId), miaSessionToken: token }
      });
    res.json({ success: true });
    } catch (error: any) {
      console.error("MIA Login error:", error);
      res.status(401).json({ error: "Invalid credentials or MIA is down: " + error.message });
    }
});

app.get("/api/mia/grades", async (req, res) => {
  const telegramId = req.query.telegramId as string;
  const semesterId = req.query.semesterId as string | undefined;
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  let userSessionToken = '';
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { id: true, miaSessionToken: true }
    });

    if (!user || !user.miaSessionToken) {
      return res.status(401).json({ error: "Not logged in to MIA" });
    }
    userSessionToken = user.miaSessionToken;

    const grades = await gradesProvider.getGrades(user.miaSessionToken, semesterId);
    
    // Cache grades in DB ONLY if no specific semester is requested (default/current semester)
    if (!semesterId) {
      for (const g of grades) {
        await prisma.grade.upsert({
          where: {
            userId_subject_category: {
              userId: user.id,
              subject: g.subject,
              category: g.category
            }
          },
          update: { currentScore: g.currentScore, maxScore: g.maxScore },
          create: {
            userId: user.id,
            subject: g.subject,
            currentScore: g.currentScore,
            maxScore: g.maxScore,
            category: g.category
          }
        });
      }
    }

    res.json(grades);
  } catch (error: any) {
    console.error("MIA Fetch grades error:", error);
    res.status(500).json({ error: "Failed to fetch grades: " + error.message });
  }
});

app.get("/api/mia/semesters", async (req, res) => {
  const telegramId = req.query.telegramId as string;
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { id: true, miaSessionToken: true }
    });

    if (!user || !user.miaSessionToken) {
      return res.status(401).json({ error: "Not logged in to MIA" });
    }

    const semesters = await gradesProvider.getSemesters(user.miaSessionToken);
    res.json(semesters);
  } catch (error: any) {
    console.error("MIA Fetch semesters error:", error);
    res.status(500).json({ error: "Failed to fetch semesters: " + error.message });
  }
});


// ==================== USER PREFERENCES ====================
app.get("/api/users/preferences", async (req, res) => {
  const telegramId = req.query.telegramId as string;
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { notify15Min: true, notify1Min: true, notifyMorning: true, notifyChanges: true, preferences: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// Update user preferences
app.post("/api/users/preferences", async (req, res) => {
  const { telegramId, notify15Min, notify1Min, notifyMorning, notifyChanges, subgroup } = req.body;
  if (!telegramId) return res.status(400).json({ error: "telegramId required" });

  try {
    const dataToUpdate: any = {};
    if (notify15Min !== undefined) dataToUpdate.notify15Min = notify15Min;
    if (notify1Min !== undefined) dataToUpdate.notify1Min = notify1Min;
    if (notifyMorning !== undefined) dataToUpdate.notifyMorning = notifyMorning;
    if (notifyChanges !== undefined) dataToUpdate.notifyChanges = notifyChanges;
    
    // We update preferences json if subgroup is provided
    if (subgroup !== undefined) {
       const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) }, select: { preferences: true } });
       const prefs: any = user?.preferences || {};
       prefs.subgroup = subgroup;
       dataToUpdate.preferences = prefs;
    }

    const user = await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: dataToUpdate
    });
    res.json({ success: true, user: { ...user, telegramId: user.telegramId?.toString() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// ==================== ADMIN ====================

app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const activeNowLimit = new Date(now.getTime() - 15 * 60000); // 15 mins
    
    const activeNow = await prisma.user.count({ where: { lastSeenAt: { gte: activeNowLimit } } });
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dau = await prisma.dailyActivity.count({ where: { date: today } });
    const totalUsers = await prisma.user.count();
    
    const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const weeklyRaw = await prisma.dailyActivity.groupBy({
      by: ['date'],
      where: { date: { gte: sevenDaysAgo } },
      _count: { id: true }
    });
    
    const weekly = weeklyRaw.map((r: any) => ({
      date: r.date.toISOString().split('T')[0],
      count: r._count.id
    }));
    
    // Sort weekly by date
    weekly.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recent schedule changes
    const recentChanges = await prisma.scheduleChange.count({
      where: { date: { gte: sevenDaysAgo } }
    });
    
    res.json({ activeNow, dau, totalUsers, weekly, recentChanges });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Analytics error" });
  }
});

// ==================== SERVER START ====================

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Sync SUTE events and faculties/schedules on startup
  console.log('Triggering background sync on startup...');
  syncEventsToDb().catch(console.error);
  syncAll().catch(console.error);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(async () => {
    await disconnectPrisma();
    console.log('Server closed.');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

