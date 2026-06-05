import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
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
    private readonly audit: AuditService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile) {
    let user = await this.usersService.findByGoogleId(profile.id);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.findByEmail(profile.email);

      if (user) {
        user = await this.usersService.update(user.id, { googleId: profile.id });
      } else {
        user = await this.usersService.create({
          name: profile.name,
          email: profile.email,
          googleId: profile.id,
        });
        isNewUser = true;
      }
    }

    if (profile.refreshToken) {
      await this.saveGoogleTokens(user.id, profile.accessToken, profile.refreshToken, profile.expiresIn);
    } else {
      await this.updateAccessToken(user.id, profile.accessToken, profile.expiresIn);
    }

    await this.audit.log(
      user.id,
      isNewUser ? AuditAction.USER_REGISTER : AuditAction.USER_LOGIN,
      { email: user.email },
    );

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
    expiresIn?: number,
  ) {
    // Usa expiresIn real retornado pelo Google (em segundos), com fallback de 1h
    const expiresAt = new Date(Date.now() + (expiresIn ?? 3600) * 1000);

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

  private async updateAccessToken(
    userId: string,
    accessToken: string,
    expiresIn?: number,
  ) {
    const expiresAt = new Date(Date.now() + (expiresIn ?? 3600) * 1000);

    const existingToken = await this.prisma.googleToken.findFirst({
      where: { userId },
    });

    if (existingToken) {
      await this.prisma.googleToken.update({
        where: { id: existingToken.id },
        data: { accessToken, expiresAt },
      });
    }
    // Se não existe token nenhum, aguarda próximo login com prompt: consent
  }
}
