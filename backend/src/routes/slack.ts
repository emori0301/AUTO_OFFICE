import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getTimesPost } from '../systems/slackClient';

const router = Router();

router.get('/times/:userId', async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!user.slackUserId) {
    res.json({ post: null });
    return;
  }

  const post = await getTimesPost(user.slackUserId);
  res.json({ post });
});

export default router;
