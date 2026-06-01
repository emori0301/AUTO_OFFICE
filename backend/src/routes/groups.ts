import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const VALID_CATEGORIES = ['project', 'team', 'club'] as const;

function formatGroup(g: {
  id: string;
  name: string;
  category: string;
  assignType: string | null;
  isActive: boolean;
  members: Array<{
    userId: string;
    role: string | null;
    assignRate: number | null;
    user: { id: string; displayName: string; jobTitle: string | null };
  }>;
}) {
  return {
    id: g.id,
    name: g.name,
    category: g.category,
    assignType: g.assignType,
    isActive: g.isActive,
    memberCount: g.members.length,
    members: g.members.map(m => ({
      userId: m.userId,
      displayName: m.user.displayName,
      jobTitle: m.user.jobTitle ?? null,
      role: m.role ?? null,
      assignRate: m.assignRate ?? null,
    })),
  };
}

// GET /api/groups?category=project|team|club
router.get('/', async (req, res) => {
  const { category } = req.query;
  try {
    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        ...(category ? { category: String(category) } : {}),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, jobTitle: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(groups.map(formatGroup));
  } catch (err) {
    console.error('[groups] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups — グループ作成（管理者のみ想定）
router.post('/', async (req, res) => {
  const { name, category, assignType } = req.body as {
    name?: string;
    category?: string;
    assignType?: string | null;
  };
  if (!name?.trim() || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    res.status(400).json({ error: 'name and valid category (project|team|club) are required' });
    return;
  }
  try {
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        category: category as string,
        assignType: category === 'project' ? (assignType ?? null) : null,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, jobTitle: true } },
          },
        },
      },
    });
    res.status(201).json(formatGroup(group));
  } catch (err) {
    console.error('[groups] create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/groups/:id — グループ詳細
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, jobTitle: true } },
          },
        },
      },
    });
    if (!group) { res.status(404).json({ error: 'Group not found' }); return; }
    res.json(formatGroup(group));
  } catch (err) {
    console.error('[groups] detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/groups/:id — グループ更新
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, assignType, isActive } = req.body as {
    name?: string;
    assignType?: string | null;
    isActive?: boolean;
  };
  try {
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (assignType !== undefined) data.assignType = assignType;
    if (isActive !== undefined) data.isActive = isActive;
    const group = await prisma.group.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, jobTitle: true } },
          },
        },
      },
    });
    res.json(formatGroup(group));
  } catch (err) {
    console.error('[groups] update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id — グループを非アクティブ化
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.group.update({ where: { id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[groups] delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/members — メンバー追加
router.post('/:id/members', async (req, res) => {
  const { id: groupId } = req.params;
  const { userId, role, assignRate } = req.body as {
    userId?: string;
    role?: string | null;
    assignRate?: number | null;
  };
  if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }
  try {
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: { role: role ?? null, assignRate: assignRate ?? null },
      create: { userId, groupId, role: role ?? null, assignRate: assignRate ?? null },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[groups] add member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id/members/:userId — メンバー削除
router.delete('/:id/members/:userId', async (req, res) => {
  const { id: groupId, userId } = req.params;
  try {
    await prisma.userGroup.delete({
      where: { userId_groupId: { userId, groupId } },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[groups] remove member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
