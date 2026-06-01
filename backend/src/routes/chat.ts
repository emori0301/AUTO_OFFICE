import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/chat/rooms
router.post('/rooms', async (req, res) => {
  const { type, name, memberIds } = req.body as {
    type: 'direct' | 'group';
    name?: string;
    memberIds: string[];
  };

  if (!Array.isArray(memberIds) || memberIds.length < 2) {
    res.status(400).json({ error: 'memberIds must have at least 2 items' });
    return;
  }

  try {
    if (type === 'direct') {
      const [a, b] = memberIds;
      const candidates = await prisma.chatRoom.findMany({
        where: { type: 'direct', members: { some: { userId: a } } },
        include: { members: true },
      });
      const existing = candidates.find(
        r => r.members.length === 2 && r.members.some(m => m.userId === b),
      );
      if (existing) { res.json(existing); return; }
    }

    const room = await prisma.chatRoom.create({
      data: {
        type,
        name: name ?? null,
        members: { create: memberIds.map(userId => ({ userId })) },
      },
      include: { members: true },
    });

    res.status(201).json(room);
  } catch (err) {
    console.error('[chat] create room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/rooms?userId=xxx
router.get('/rooms', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) { res.status(400).json({ error: 'userId required' }); return; }

  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, displayName: true } } },
        },
        messages: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rooms);
  } catch (err) {
    console.error('[chat] list rooms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId: req.params.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    console.error('[chat] messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
