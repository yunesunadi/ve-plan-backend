import { ExtractJwt, Strategy } from "passport-jwt";
import passport from "passport";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import * as UserService from '../services/UserService';
import { signAuthToken } from '../helpers/authToken';

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

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
      return done(new Error('No email found in Google profile'));
    }

    const user: any = await UserService.upsertGoogleUser({
      googleId: profile.id,
      name: profile._json.name || profile.displayName || "Google user",
      email: profile.emails[0].value,
      emailVerified: (profile._json as any).email_verified === true,
      profile: profile.photos?.[0]?.value,
    });

    const token = signAuthToken(user);
    return done(null, { token });
  } catch (err) {
    return done(err);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
  profileFields: ['id', 'emails', 'name', 'photos']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
      return done(new Error('No email found in Facebook profile'));
    }

    const user: any = await UserService.upsertFacebookUser({
      facebookId: profile.id,
      name: `${profile._json.first_name} ${profile._json.last_name}`,
      email: profile.emails[0].value,
      profile: profile.photos?.[0]?.value,
    });

    const token = signAuthToken(user);
    return done(null, { token });
  } catch (err) {
    return done(err);
  }
}));
