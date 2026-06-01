import cron from 'node-cron';
import { getCalendarEvents, CalendarEvent } from './calendarClient';
import { cache } from './cache';
import { broadcast } from './wsHub';
import { prisma } from '../lib/prisma';

export type WorkStyle =
  | 'office'
  | 'in_meeting'
  | 'remote'
  | 'ses'
  | 'vacation'
  | 'business_trip'
  | 'early_leave';

export const ALL_WORK_STYLES: WorkStyle[] = [
  'office', 'in_meeting', 'remote', 'ses', 'vacation', 'business_trip', 'early_leave',
];

export const MANUAL_OVERRIDE_STYLES: WorkStyle[] = [
  'office', 'remote', 'ses', 'vacation', 'business_trip', 'early_leave',
];

export type DotColor = 'free' | 'client' | 'inhouse' | 'multi' | 'special';

export type UserState = {
  id: string;
  displayName: string;
  email: string;
  workStyle: WorkStyle;
  locationHint?: string;
  deskX: number | null;
  deskY: number | null;
  floorId: string | null;
  branchId: string;
  assignDot: DotColor;
};

type GroupInfo = { role: string | null; group: { category: string; assignType: string | null; isActive: boolean } };

function computeAssignDot(userGroups: GroupInfo[]): DotColor {
  if (userGroups.some(ug => ug.role === 'special')) return 'special';
  const projects = userGroups.filter(ug => ug.group.category === 'project' && ug.group.isActive);
  if (projects.length === 0) return 'free';
  if (projects.length > 1) return 'multi';
  return projects[0].group.assignType === 'client' ? 'client' : 'inhouse';
}

const INCLUDE_GROUPS = {
  groups: {
    select: {
      role: true,
      group: { select: { category: true, assignType: true, isActive: true } },
    },
  },
} as const;

const KEYWORDS: Record<'vacation' | 'business_trip' | 'ses' | 'remote', string[]> = {
  vacation:      ['有給', '休暇', '休み', 'vacation', 'PTO'],
  business_trip: ['出張', '訪問'],
  ses:           ['常駐', 'SES'],
  remote:        ['在宅', 'WFH', 'テレワーク', 'リモート'],
};

function isNowActive(event: CalendarEvent): boolean {
  if (event.allDay) return false;
  const now = Date.now();
  return new Date(event.start).getTime() <= now && now < new Date(event.end).getTime();
}

function matchesKeyword(summary: string, keywords: string[]): boolean {
  const lower = summary.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

// Priority: vacation → early_leave → business_trip → ses → remote → in_meeting → office
// early_leave is manual-only; this function handles calendar-based detection only.
export function determineWorkStyle(
  events: CalendarEvent[],
): { workStyle: WorkStyle; locationHint?: string } {
  for (const e of events) {
    if (matchesKeyword(e.summary, KEYWORDS.vacation)) return { workStyle: 'vacation' };
  }
  for (const e of events) {
    if (matchesKeyword(e.summary, KEYWORDS.business_trip)) return { workStyle: 'business_trip' };
  }
  for (const e of events) {
    if (matchesKeyword(e.summary, KEYWORDS.ses)) return { workStyle: 'ses' };
  }
  for (const e of events) {
    if (matchesKeyword(e.summary, KEYWORDS.remote)) return { workStyle: 'remote' };
  }
  for (const e of events) {
    if (isNowActive(e)) return { workStyle: 'in_meeting', locationHint: e.location };
  }
  return { workStyle: 'office' };
}

export async function syncAllUsers(): Promise<void> {
  const users = await prisma.user.findMany({ include: INCLUDE_GROUPS });

  await Promise.all(users.map(async user => {
    try {
      const assignDot = computeAssignDot(user.groups);

      // Manual override takes priority over everything
      const overrideRaw = await cache.get(`user:${user.id}:manual_override`);
      let workStyle: WorkStyle;
      let locationHint: string | undefined;

      if (overrideRaw) {
        workStyle = overrideRaw as WorkStyle;
      } else {
        const cacheKey = `calendar:${user.id}:today`;
        const cached = await cache.get(cacheKey);
        let events: CalendarEvent[];
        if (cached) {
          events = JSON.parse(cached);
        } else {
          events = await getCalendarEvents(user.email);
          await cache.set(cacheKey, JSON.stringify(events), 300);
        }
        const result = determineWorkStyle(events);
        workStyle = result.workStyle;
        locationHint = result.locationHint;
      }

      const newState: UserState = {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        workStyle,
        locationHint,
        deskX: user.deskX,
        deskY: user.deskY,
        floorId: user.floorId,
        branchId: user.branchId,
        assignDot,
      };

      const stateKey = `user:${user.id}:state`;
      const prevRaw = await cache.get(stateKey);
      const prevWorkStyle = prevRaw ? (JSON.parse(prevRaw) as UserState).workStyle : null;

      await cache.set(stateKey, JSON.stringify(newState), 60);

      // Persist to DB and broadcast only when state changes
      if (prevWorkStyle !== workStyle) {
        await prisma.user.update({
          where: { id: user.id },
          data: { workStyle },
        });
        broadcast({ type: 'STATE_CHANGE', payload: newState });
        console.log(`[stateEngine] ${user.displayName}: ${prevWorkStyle ?? '—'} → ${workStyle}`);
      }
    } catch (err) {
      console.error(`[stateEngine] Error processing ${user.email}:`, err);
    }
  }));
}

export async function getAllUserStates(): Promise<UserState[]> {
  const users = await prisma.user.findMany({ include: INCLUDE_GROUPS });
  return Promise.all(users.map(async user => {
    const assignDot = computeAssignDot(user.groups);

    // Manual override always wins
    const overrideRaw = await cache.get(`user:${user.id}:manual_override`);
    if (overrideRaw) {
      const stateKey = `user:${user.id}:state`;
      const cached = await cache.get(stateKey);
      const base = cached ? (JSON.parse(cached) as UserState) : null;
      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        workStyle: overrideRaw as WorkStyle,
        deskX: base?.deskX ?? user.deskX,
        deskY: base?.deskY ?? user.deskY,
        floorId: base?.floorId ?? user.floorId,
        branchId: user.branchId,
        assignDot,
      };
    }
    const stateKey = `user:${user.id}:state`;
    const cached = await cache.get(stateKey);
    if (cached) {
      const parsed = JSON.parse(cached) as UserState;
      return { ...parsed, assignDot };
    }
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      workStyle: user.workStyle as WorkStyle,
      deskX: user.deskX,
      deskY: user.deskY,
      floorId: user.floorId,
      branchId: user.branchId,
      assignDot,
    };
  }));
}

export function startCron(): void {
  // Sync every minute
  cron.schedule('* * * * *', () => {
    syncAllUsers().catch(err => console.error('[stateEngine] syncAllUsers error:', err));
  });

  // Delete expired chat messages every hour
  cron.schedule('0 * * * *', async () => {
    const result = await prisma.chatMessage.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`[stateEngine] Deleted ${result.count} expired chat messages`);
    }
  });

  // Reset early_leave manual overrides at midnight
  cron.schedule('0 0 * * *', async () => {
    const users = await prisma.user.findMany();
    await Promise.all(users.map(async user => {
      const key = `user:${user.id}:manual_override`;
      const val = await cache.get(key);
      if (val === 'early_leave') {
        await cache.del(key);
        console.log(`[stateEngine] Reset early_leave for ${user.displayName}`);
      }
    }));
  });

  console.log('[stateEngine] Cron jobs started');
}
