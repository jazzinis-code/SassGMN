import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../common/prisma/prisma.service';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile) {
    let user = await this.usersService.findByGoogleId(profile.id);

    if (!user) {
      user = await this.usersService.findByEmail(profile.email);

      if (user) {
        user = await this.usersService.update(user.id, {
          googleId: profile.id,
        });
      } else {
        user = await this.usersService.create({
          name: profile.name,
          email: profile.email,
          googleId: profile.id,
        });
      }
    }

    await this.saveGoogleTokens(user.id, profile.accessToken, profile.refreshToken);

    return user;
  }

  async login(user: { id: string; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  private async saveGoogleTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ) {
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    const existingToken = await this.prisma.googleToken.findFirst({
      where: { userId },
    });

    if (existingToken) {
      await this.prisma.googleToken.update({
        where: { id: existingToken.id },
        data: { accessToken, refreshToken, expiresAt },
      });
    } else {
      await this.prisma.googleToken.create({
        data: { userId, accessToken, refreshToken, expiresAt },
      });
    }
  }
}
