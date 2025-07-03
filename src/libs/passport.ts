import { ExtractJwt, Strategy } from "passport-jwt";
import passport from "passport";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
const UserService = require('../services/UserService');
import jwt from 'jsonwebtoken';

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

    let user = await UserService.findByEmail(profile.emails[0].value);

    if (user && !user.googleId) {
      user.googleId = profile.id;
      await user.save();
    }

    if (!user) {
      user = await UserService.create({
        name: profile._json.name,
        email: profile.emails[0].value,
        googleId: profile.id,
        isVerified: true,
        profile: profile.photos?.[0]?.value
      });
    }
    
    user._id = user._id.toString();
    user = user.toJSON();
    delete user.password;
    delete user.verificationToken;
    
    const token = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '14d' });
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

    let user = await UserService.findByEmail(profile.emails[0].value);

    if (user && !user.facebookId) {
      user.facebookId = profile.id;
      await user.save();
    }

    if (!user) {
      user = await UserService.create({
        name: `${profile._json.first_name} ${profile._json.last_name}`,
        email: profile.emails[0].value,
        facebookId: profile.id,
        isVerified: true,
        profile: profile.photos?.[0]?.value
      });
    }

    user._id = user._id.toString();
    user = user.toJSON();
    delete user.password;
    delete user.verificationToken;

    const token = jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '14d' });
    return done(null, { token });
  } catch (err) {
    return done(err);
  }
}));
