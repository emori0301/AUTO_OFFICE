import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import calendarRouter from './routes/calendar';
import statusRouter from './routes/status';
import usersRouter from './routes/users';
import profileRouter from './routes/profile';
import groupsRouter from './routes/groups';
import chatRouter from './routes/chat';
import adminRouter from './routes/admin';
import slackRouter from './routes/slack';
import authRouter from './routes/auth';
import { initWsHub } from './systems/wsHub';
import { startCron, syncAllUsers, getAllUserStates } from './systems/stateEngine';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());

// セッションはGoogle OAuthのstateパラメータ（CSRF保護）のみに使用
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'auto-office-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 5分（OAuth dance用）
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/status', statusRouter);
app.use('/api/users', usersRouter);
app.use('/api/profile', profileRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/slack', slackRouter);

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

initWsHub(wss, getAllUserStates);

startCron();

syncAllUsers().catch(err => console.error('[server] Initial sync error:', err));

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
