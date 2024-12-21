import { ExtractJwt, Strategy } from "passport-jwt";
import passport from "passport";

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: `${process.env.JWT_SECRET}`
};

passport.use(new Strategy(options, async (payload: any, done: any) => {
  try {
    if (!payload) return done(new Error());
    return done(null, payload);
  } catch (err: any) {
    return done(err);
  }
}));