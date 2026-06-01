import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getCalendarEvents } from '../systems/calendarClient';
import { cache } from '../systems/cache';

const router = Router();

// GET /api/users — 全ユーザー（グループ付き、フィルタ用）
router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        branch: { select: { name: true } },
        groups: {
          include: { group: { select: { id: true, name: true, category: true } } },
        },
      },
      orderBy: { displayName: 'asc' },
    });
    res.json(users.map(u => ({
      id: u.id,
      displayName: u.displayName,
      jobTitle: u.jobTitle ?? null,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branch.name,
      points: u.points,
      groups: u.groups.map(ug => ({
        groupId: ug.groupId,
        groupName: ug.group.name,
        category: ug.group.category,
      })),
    })));
  } catch (err) {
    console.error('[users] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/points — ポイント残高
router.get('/:id/points', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, points: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ points: user.points });
  } catch (err) {
    console.error('[users] points error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/detail — ユーザー詳細（案件・カレンダー付き）
router.get('/:id/detail', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        branch: { select: { name: true } },
        groups: {
          include: {
            group: { select: { id: true, name: true, category: true, assignType: true } },
          },
        },
      },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const cacheKey = `calendar:${id}:today`;
    const cached = await cache.get(cacheKey);
    let events: Array<{ summary: string; start: string; end: string; allDay: boolean; location?: string }>;
    if (cached) {
      events = JSON.parse(cached);
    } else {
      events = await getCalendarEvents(user.email);
      await cache.set(cacheKey, JSON.stringify(events), 300);
    }

    const now = Date.now();
    const todayEvents = events.map(e => ({
      summary: e.summary,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      location: e.location,
      isActive: !e.allDay && new Date(e.start).getTime() <= now && now < new Date(e.end).getTime(),
    }));

    const projects = user.groups
      .filter(ug => ug.group.category === 'project')
      .map(ug => ({
        groupId: ug.groupId,
        groupName: ug.group.name,
        assignType: ug.group.assignType,
        role: ug.role,
        assignRate: ug.assignRate,
      }));

    res.json({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      jobTitle: user.jobTitle ?? null,
      branchId: user.branchId,
      branchName: user.branch.name,
      workStyle: user.workStyle,
      projects,
      todayEvents,
    });
  } catch (err) {
    console.error('[users] detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
