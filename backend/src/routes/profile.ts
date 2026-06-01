import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { cache } from '../systems/cache';
import { broadcast } from '../systems/wsHub';
import { getAllUserStates, MANUAL_OVERRIDE_STYLES } from '../systems/stateEngine';

const router = Router();

// GET /api/profile/questions — アクティブな質問一覧
router.get('/questions', async (_req, res) => {
  try {
    const questions = await prisma.profileQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    res.json(questions);
  } catch (err) {
    console.error('[profile] questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profile/:userId — プロフィール取得
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: { select: { name: true } },
        profiles: {
          include: {
            question: { select: { id: true, question: true, order: true } },
          },
          orderBy: { question: { order: 'asc' } },
        },
      },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const manualOverride = await cache.get(`user:${userId}:manual_override`);

    res.json({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      jobTitle: user.jobTitle ?? null,
      branchName: user.branch.name,
      birthDate: user.birthDate ?? null,
      joinDate: user.joinDate ?? null,
      avatarConfig: user.avatarConfig ?? null,
      workStyle: user.workStyle,
      manualWorkStyle: manualOverride ?? null,
      profiles: user.profiles.map(p => ({
        questionId: p.questionId,
        question: p.question.question,
        answer: p.answer,
      })),
    });
  } catch (err) {
    console.error('[profile] get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/profile/:userId — 基本情報・アバター・プロフィール回答を更新
router.patch('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { displayName, jobTitle, birthDate, joinDate, avatarConfig, answers } = req.body as {
    displayName?: string;
    jobTitle?: string;
    birthDate?: string | null;
    joinDate?: string | null;
    avatarConfig?: Record<string, unknown>;
    answers?: { questionId: string; answer: string }[];
  };

  try {
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle?.trim() || null;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (joinDate !== undefined) updateData.joinDate = joinDate ? new Date(joinDate) : null;
    if (avatarConfig !== undefined) updateData.avatarConfig = avatarConfig;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { branch: { select: { name: true } } },
    });

    // プロフィール回答を保存（ユニーク制約なしのため findFirst + update/create）
    if (answers && answers.length > 0) {
      await Promise.all(answers.map(async a => {
        const existing = await prisma.userProfile.findFirst({
          where: { userId, questionId: a.questionId },
        });
        if (existing) {
          await prisma.userProfile.update({ where: { id: existing.id }, data: { answer: a.answer } });
        } else {
          await prisma.userProfile.create({ data: { userId, questionId: a.questionId, answer: a.answer } });
        }
      }));
    }

    // 名前変更の場合はWS STATE_CHANGEでbroadcast
    if (displayName !== undefined) {
      const stateKey = `user:${userId}:state`;
      const cached = await cache.get(stateKey);
      if (cached) {
        const prev = JSON.parse(cached);
        const updated = { ...prev, displayName: user.displayName };
        await cache.set(stateKey, JSON.stringify(updated), 60);
        broadcast({ type: 'STATE_CHANGE', payload: updated });
      } else {
        const states = await getAllUserStates();
        const s = states.find(st => st.id === userId);
        if (s) broadcast({ type: 'STATE_CHANGE', payload: { ...s, displayName: user.displayName } });
      }
    }

    res.json({ ok: true, displayName: user.displayName });
  } catch (err) {
    console.error('[profile] patch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/:userId/workstyle — 在籍形態を手動上書き
router.post('/:userId/workstyle', async (req, res) => {
  const { userId } = req.params;
  const { workStyle } = req.body as { workStyle: string };

  if (!(MANUAL_OVERRIDE_STYLES as string[]).includes(workStyle)) {
    res.status(400).json({ error: 'Invalid workStyle' });
    return;
  }

  try {
    await cache.set(`user:${userId}:manual_override`, workStyle);

    // キャッシュとDBを即時更新してbroadcast
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await prisma.user.update({ where: { id: userId }, data: { workStyle } });
      const stateKey = `user:${userId}:state`;
      const cached = await cache.get(stateKey);
      const base = cached ? JSON.parse(cached) : {};
      const updated = { ...base, id: userId, displayName: user.displayName, email: user.email, workStyle, branchId: user.branchId };
      await cache.set(stateKey, JSON.stringify(updated), 60);
      broadcast({ type: 'STATE_CHANGE', payload: updated });
    }

    res.json({ ok: true, workStyle });
  } catch (err) {
    console.error('[profile] workstyle override error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/profile/:userId/workstyle — 手動上書き解除
router.delete('/:userId/workstyle', async (req, res) => {
  const { userId } = req.params;
  try {
    await cache.del(`user:${userId}:manual_override`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[profile] workstyle reset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
