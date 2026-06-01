import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '../lib/prisma';

interface ExtWs extends WebSocket {
  isAlive: boolean;
  userId?: string;
}
let wss: WebSocketServer | null = null;

export function initWsHub(
  server: WebSocketServer,
  getStates: () => Promise<unknown[]>,
): void {
  wss = server;

  // Server-side heartbeat: ping every 30s, terminate unresponsive clients
  const heartbeatTimer = setInterval(() => {
    wss!.clients.forEach(raw => {
      const ws = raw as ExtWs;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeatTimer));

  wss.on('connection', async (raw, req) => {
    const ws = raw as ExtWs;
    ws.isAlive = true;

    // Extract userId from ?userId=xxx query param
    const url = new URL(req.url ?? '/', 'http://localhost');
    ws.userId = url.searchParams.get('userId') ?? undefined;

    ws.on('pong', () => { ws.isAlive = true; });

    // Send INIT with all current user states
    try {
      const states = await getStates();
      ws.send(JSON.stringify({ type: 'INIT', payload: states }));
    } catch (err) {
      console.error('[wsHub] INIT error:', err);
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;

        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        if (msg.type === 'CHAT_SEND') {
          const roomId = msg.roomId as string | undefined;
          const body = msg.body as string | undefined;
          const senderId = ws.userId;
          if (!senderId || !roomId || !body?.trim()) return;

          // Verify sender is a member of the room
          const membership = await prisma.chatMember.findFirst({
            where: { roomId, userId: senderId },
          });
          if (!membership) return;

          const now = new Date();
          const message = await prisma.chatMessage.create({
            data: {
              roomId,
              senderId,
              body: body.trim(),
              createdAt: now,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            },
          });

          await broadcastToRoom(roomId, {
            type: 'CHAT_MESSAGE',
            roomId,
            message: {
              id: message.id,
              roomId: message.roomId,
              senderId: message.senderId,
              body: message.body,
              createdAt: message.createdAt,
            },
          });
        }
      } catch {
        // ignore malformed messages
      }
    });
  });
}

// Broadcast to all members of a specific chat room who are currently connected
async function broadcastToRoom(roomId: string, msg: object): Promise<void> {
  if (!wss) return;

  const members = await prisma.chatMember.findMany({
    where: { roomId },
    select: { userId: true },
  });
  const memberIds = new Set(members.map(m => m.userId));

  const data = JSON.stringify(msg);
  wss.clients.forEach(raw => {
    const ws = raw as ExtWs;
    if (ws.readyState === WebSocket.OPEN && ws.userId && memberIds.has(ws.userId)) {
      ws.send(data);
    }
  });
}

export function broadcast(msg: object): void {
  if (!wss) return;
  const data = JSON.stringify(msg);
  wss.clients.forEach(raw => {
    if (raw.readyState === WebSocket.OPEN) {
      raw.send(data);
    }
  });
}
