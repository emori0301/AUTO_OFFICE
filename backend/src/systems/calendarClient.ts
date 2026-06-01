import fs from 'fs';
import { google } from 'googleapis';

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;   // ISO datetime or date string
  end: string;
  allDay: boolean;
  location?: string;
};

// Emails that receive mock "朝会（竹）" in_meeting event
const MOCK_MEETING_EMAILS = new Set([
  'tanaka@example.com',
  'suzuki@example.com',
  'yamada@example.com',
  'takahashi@example.com',
]);

// Emails that receive mock "在宅作業" remote event
const MOCK_REMOTE_EMAILS = new Set([
  'kato@example.com',
  'yoshida@example.com',
]);

function todayISO(hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function getMockEvents(email: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  if (MOCK_MEETING_EMAILS.has(email)) {
    events.push({
      id: `mock-meeting-${email}`,
      summary: '朝会（竹）',
      start: todayISO(10, 0),
      end: todayISO(11, 0),
      allDay: false,
      location: '竹',
    });
  }

  if (MOCK_REMOTE_EMAILS.has(email)) {
    const today = new Date().toISOString().slice(0, 10);
    events.push({
      id: `mock-remote-${email}`,
      summary: '在宅作業',
      start: today,
      end: today,
      allDay: true,
    });
  }

  return events;
}

function buildAuth(email: string) {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  let credentials: object;
  if (keyPath) {
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } else if (keyJson) {
    credentials = JSON.parse(keyJson);
  } else {
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  // Domain-wide delegation: impersonate the target user
  const authClient = auth.fromJSON(credentials as Parameters<typeof auth.fromJSON>[0]);
  if ('subject' in authClient) {
    (authClient as { subject: string }).subject = email;
  }

  return authClient;
}

export async function getCalendarEvents(email: string): Promise<CalendarEvent[]> {
  const authClient = buildAuth(email);
  if (!authClient) {
    return getMockEvents(email);
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient as Parameters<typeof google.calendar>[0]['auth'] });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const res = await calendar.events.list({
      calendarId: email,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (res.data.items ?? []).map(e => ({
      id: e.id ?? '',
      summary: e.summary ?? '(無題)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      allDay: !e.start?.dateTime,
      location: e.location ?? undefined,
    }));
  } catch (err) {
    console.error(`[calendar] Google API error for ${email}:`, err);
    return getMockEvents(email);
  }
}
