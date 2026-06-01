import { WebClient } from '@slack/web-api';
import { cache } from './cache';

const TIMES_CACHE_TTL = 1800; // 30 minutes
const TIMES_24H = 24 * 60 * 60 * 1000;

let slack: WebClient | null = null;

function getClient(): WebClient | null {
  if (!process.env.SLACK_BOT_TOKEN) return null;
  if (!slack) slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  return slack;
}

export type TimesPost = {
  text: string;
  postedAt: string; // ISO
};

export async function getTimesPost(slackUserId: string): Promise<TimesPost | null> {
  const cacheKey = `slack:${slackUserId}:times`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached) as TimesPost | null;

  const client = getClient();
  if (!client) return null;

  try {
    // ボットが参加しているチャンネルからtimes-*を探す
    const listRes = await client.conversations.list({
      types: 'public_channel',
      exclude_archived: true,
      limit: 1000,
    });

    const timesChannels = listRes.channels?.filter(c =>
      c.name?.startsWith('times') && c.is_member,
    ) ?? [];

    const cutoff = Date.now() - TIMES_24H;

    for (const ch of timesChannels) {
      if (!ch.id) continue;
      const histRes = await client.conversations.history({
        channel: ch.id,
        limit: 30,
        oldest: String(cutoff / 1000),
      });

      const msg = histRes.messages?.find(m =>
        m.user === slackUserId && !m.subtype && m.text,
      );

      if (msg) {
        const post: TimesPost = {
          text: msg.text ?? '',
          postedAt: new Date(parseFloat(msg.ts ?? '0') * 1000).toISOString(),
        };
        await cache.set(cacheKey, JSON.stringify(post), TIMES_CACHE_TTL);
        return post;
      }
    }

    await cache.set(cacheKey, JSON.stringify(null), TIMES_CACHE_TTL);
    return null;
  } catch (err) {
    console.error(`[slack] Error fetching times for ${slackUserId}:`, err);
    return null;
  }
}
