import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ── ポイント付与 ──────────────────────────────────────────────────

// POST /api/admin/points/grant
router.post('/points/grant', async (req, res) => {
  const { grantedBy, targetType, targetId, amount, reason } = req.body as {
    grantedBy: string;
    targetType: 'user' | 'branch' | 'group';
    targetId: string;
    amount: number;
    reason?: string;
  };

  if (!grantedBy || !['user', 'branch', 'group'].includes(targetType) || !targetId || !(amount > 0)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  let userIds: string[] = [];
  if (targetType === 'user') {
    userIds = [targetId];
  } else if (targetType === 'branch') {
    const users = await prisma.user.findMany({ where: { branchId: targetId }, select: { id: true } });
    userIds = users.map(u => u.id);
  } else {
    const members = await prisma.userGroup.findMany({ where: { groupId: targetId }, select: { userId: true } });
    userIds = members.map(m => m.userId);
  }

  if (userIds.length === 0) return res.status(404).json({ error: 'No target users found' });

  await prisma.$transaction([
    ...userIds.map(uid =>
      prisma.user.update({ where: { id: uid }, data: { points: { increment: amount } } }),
    ),
    prisma.pointGrant.create({
      data: { grantedBy, targetType, targetId, amount, reason: reason ?? null },
    }),
  ]);

  res.json({ ok: true, grantedTo: userIds.length });
});

// GET /api/admin/points/history
router.get('/points/history', async (_req, res) => {
  const history = await prisma.pointGrant.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(history);
});

// ── プロフィール質問管理 ─────────────────────────────────────────

// GET /api/admin/questions (全質問、inactive含む)
router.get('/questions', async (_req, res) => {
  const questions = await prisma.profileQuestion.findMany({ orderBy: { order: 'asc' } });
  res.json(questions);
});

// POST /api/admin/questions
router.post('/questions', async (req, res) => {
  const { question } = req.body as { question?: string };
  if (!question?.trim()) return res.status(400).json({ error: 'question is required' });

  const agg = await prisma.profileQuestion.aggregate({ _max: { order: true } });
  const newOrder = (agg._max.order ?? 0) + 1;
  const q = await prisma.profileQuestion.create({
    data: { question: question.trim(), order: newOrder },
  });
  res.status(201).json(q);
});

// PATCH /api/admin/questions/:id
router.patch('/questions/:id', async (req, res) => {
  const { question, isActive } = req.body as { question?: string; isActive?: boolean };
  const data: Record<string, unknown> = {};
  if (question !== undefined) data.question = question.trim();
  if (isActive !== undefined) data.isActive = isActive;
  const q = await prisma.profileQuestion.update({ where: { id: req.params.id }, data });
  res.json(q);
});

// DELETE /api/admin/questions/:id (soft delete)
router.delete('/questions/:id', async (req, res) => {
  await prisma.profileQuestion.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ ok: true });
});

// POST /api/admin/questions/reorder
router.post('/questions/reorder', async (req, res) => {
  const { orderedIds } = req.body as { orderedIds: string[] };
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds required' });

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.profileQuestion.update({ where: { id }, data: { order: index + 1 } }),
    ),
  );
  res.json({ ok: true });
});

// ── レイアウト管理 ────────────────────────────────────────────────

// GET /api/admin/layout
router.get('/layout', async (_req, res) => {
  const floor = await prisma.floor.findFirst({ orderBy: { name: 'asc' } });
  if (!floor) return res.json({ floorId: null, objects: [] });

  const objects = await prisma.layoutObject.findMany({
    where: { floorId: floor.id },
    orderBy: { id: 'asc' },
  });
  res.json({ floorId: floor.id, objects });
});

// PUT /api/admin/layout (全置換)
router.put('/layout', async (req, res) => {
  const { floorId, objects } = req.body as {
    floorId: string;
    objects: Array<{ type: string; label: string | null; x: number; y: number; width: number; height: number }>;
  };
  if (!floorId || !Array.isArray(objects)) return res.status(400).json({ error: 'Invalid payload' });

  await prisma.$transaction([
    prisma.layoutObject.deleteMany({ where: { floorId } }),
    prisma.layoutObject.createMany({
      data: objects.map(o => ({
        floorId,
        type: o.type,
        label: o.label ?? null,
        x: Math.round(o.x),
        y: Math.round(o.y),
        width: Math.round(o.width),
        height: Math.round(o.height),
      })),
    }),
  ]);
  res.json({ ok: true });
});

// GET /api/admin/branches
router.get('/branches', async (_req, res) => {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  res.json(branches);
});

export default router;
