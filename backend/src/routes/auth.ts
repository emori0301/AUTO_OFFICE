import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackURL:  process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email    = profile.emails?.[0]?.value;
      if (!email) return done(null, false);

      // googleIdで検索 → なければemailで検索してgoogleIdをリンク
      let user = await prisma.user.findFirst({ where: { googleId } });
      if (!user) {
        user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          user = await prisma.user.update({ where: { id: user.id }, data: { googleId } });
        }
      }

      if (!user) return done(null, false); // 未登録ユーザー
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  },
));

// セッションはOAuth danceのみに使用（ログイン維持には使わない）
passport.serializeUser((user: Express.User, done) => done(null, (user as { id: string }).id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

const router = Router();

router.get('/google',
  passport.authenticate('google', { scope: ['openid', 'email', 'profile'] }),
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}?login_error=not_registered` }),
  (req, res) => {
    const user = req.user as { id: string };
    req.logout(() => {}); // セッションをすぐ破棄
    res.redirect(`${FRONTEND_URL}?userId=${encodeURIComponent(user.id)}`);
  },
);

export default router;
