import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getCalendarEvents } from '../systems/calendarClient';
import { cache } from '../systems/cache';

const router = Router();

const CALENDAR_CACHE_TTL = 300; // 5 minutes

router.get('/test/:email', async (req, res) => {
  const { email } = req.params;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const cacheKey = `calendar:${user.id}:today`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    res.json({ source: 'cache', userId: user.id, email, events: JSON.parse(cached) });
    return;
  }

  const events = await getCalendarEvents(email);
  await cache.set(cacheKey, JSON.stringify(events), CALENDAR_CACHE_TTL);

  res.json({ source: 'fresh', userId: user.id, email, events });
});

export default router;
