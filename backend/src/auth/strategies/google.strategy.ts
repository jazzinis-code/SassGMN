import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService, GoogleProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('google.clientId'),
      clientSecret: configService.get<string>('google.clientSecret'),
      callbackURL: configService.get<string>('google.callbackUrl'),
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/business.manage',
      ],
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string | undefined,
    profile: { id: string; emails: { value: string }[]; displayName: string },
    done: VerifyCallback,
  ): Promise<void> {
    const googleProfile: GoogleProfile = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      accessToken,
      refreshToken: refreshToken ?? undefined,
      // expiresIn não é exposto diretamente pelo passport-google-oauth20;
      // será tratado com fallback de 3600s em auth.service.ts
    };

    const user = await this.authService.validateGoogleUser(googleProfile);
    done(null, user);
  }
}
