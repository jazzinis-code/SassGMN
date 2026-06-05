import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, mybusinessbusinessinformation_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../common/prisma/prisma.service';

export interface GoogleReview {
  reviewId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createTime: string;
}

export interface GoogleBusinessProfile {
  name: string;
  title: string;
  locationId: string;
}

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly oauth2Client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      this.configService.get<string>('google.callbackUrl'),
    );
  }

  async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const token = await this.prisma.googleToken.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!token) {
      throw new UnauthorizedException('Token do Google nao encontrado. Faca login novamente.');
    }

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt.getTime(),
    });

    // Refresh token if expired
    if (token.expiresAt.getTime() < Date.now()) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.prisma.googleToken.update({
          where: { id: token.id },
          data: {
            accessToken: credentials.access_token || token.accessToken,
            refreshToken: credentials.refresh_token || token.refreshToken,
            expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
          },
        });
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        this.logger.error('Erro ao renovar token do Google', error);
        throw new UnauthorizedException('Erro ao renovar autenticacao. Faca login novamente.');
      }
    }

    return this.oauth2Client;
  }

  async listBusinessProfiles(userId: string): Promise<GoogleBusinessProfile[]> {
    const auth = await this.getAuthenticatedClient(userId);

    try {
      const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth });
      const accountsResponse = await mybusiness.accounts.list();
      const accounts = accountsResponse.data.accounts || [];

      const profiles: GoogleBusinessProfile[] = [];

      for (const account of accounts) {
        if (!account.name) continue;

        const businessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
        const locationsResponse = await businessInfo.accounts.locations.list({
          parent: account.name,
          readMask: 'name,title',
        });

        const locations = locationsResponse.data.locations || [];
        for (const location of locations) {
          if (location.name && location.title) {
            profiles.push({
              name: location.name,
              title: location.title,
              locationId: location.name.split('/').pop() || '',
            });
          }
        }
      }

      return profiles;
    } catch (error) {
      this.logger.error('Erro ao listar perfis do Google Business', error);
      throw error;
    }
  }

  async fetchReviews(userId: string, locationName: string): Promise<GoogleReview[]> {
    const auth = await this.getAuthenticatedClient(userId);

    try {
      const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth });
      // The My Business API uses the account/location path for reviews
      const response = await (google as any).mybusiness({ version: 'v4', auth }).accounts.locations.reviews.list({
        parent: locationName,
        pageSize: 50,
      });

      const reviews = response.data.reviews || [];

      return reviews.map((review: any) => ({
        reviewId: review.reviewId || review.name?.split('/').pop() || '',
        reviewerName: review.reviewer?.displayName || 'Anonimo',
        rating: this.parseRating(review.starRating),
        comment: review.comment || null,
        createTime: review.createTime || new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar avaliacoes do Google', error);
      throw error;
    }
  }

  async postReply(
    userId: string,
    locationName: string,
    reviewId: string,
    replyText: string,
  ): Promise<void> {
    const auth = await this.getAuthenticatedClient(userId);

    try {
      await (google as any).mybusiness({ version: 'v4', auth }).accounts.locations.reviews.updateReply({
        name: `${locationName}/reviews/${reviewId}`,
        requestBody: {
          comment: replyText,
        },
      });

      this.logger.log(`Resposta publicada para review ${reviewId}`);
    } catch (error) {
      this.logger.error('Erro ao publicar resposta no Google', error);
      throw error;
    }
  }

  private parseRating(starRating: string): number {
    const ratingMap: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };
    return ratingMap[starRating] || 0;
  }
}
