import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { cache } from '../systems/cache';
import { getAllUserStates, syncAllUsers, WorkStyle, ALL_WORK_STYLES } from '../systems/stateEngine';

const router = Router();

// GET /api/status/all — 全ユーザーの現在状態を返す
router.get('/all', async (_req, res) => {
  try {
    const states = await getAllUserStates();
    res.json(states);
  } catch (err) {
    console.error('[status] getAllUserStates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/status/override — 手動上書きをセット
// Body: { userId: string, workStyle: WorkStyle }
router.post('/override', async (req, res) => {
  const { userId, workStyle } = req.body as { userId?: string; workStyle?: string };

  if (!userId || !workStyle) {
    res.status(400).json({ error: 'userId and workStyle are required' });
    return;
  }
  if (!ALL_WORK_STYLES.includes(workStyle as WorkStyle)) {
    res.status(400).json({ error: `Invalid workStyle. Must be one of: ${ALL_WORK_STYLES.join(', ')}` });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await cache.set(`user:${userId}:manual_override`, workStyle);
  console.log(`[status] Manual override set: ${user.displayName} → ${workStyle}`);

  res.json({ ok: true, userId, workStyle });
});

// DELETE /api/status/override/:userId — 手動上書きを解除
router.delete('/override/:userId', async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await cache.del(`user:${userId}:manual_override`);
  console.log(`[status] Manual override cleared: ${user.displayName}`);

  res.json({ ok: true, userId });
});

// POST /api/status/sync — 即時に全ユーザー状態を同期（開発・テスト用）
router.post('/sync', async (_req, res) => {
  try {
    await syncAllUsers();
    res.json({ ok: true });
  } catch (err) {
    console.error('[status] sync error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
