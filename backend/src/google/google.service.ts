import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
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

/**
 * My Business Reviews API v1 — resposta de listagem
 * Ref: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
 */
interface MyBusinessReviewsResponse {
  reviews?: MyBusinessReview[];
  nextPageToken?: string;
  totalReviewCount?: number;
}

interface MyBusinessReview {
  name?: string;
  reviewId?: string;
  reviewer?: { displayName?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}

/**
 * Base URL da My Business Reviews API v1.
 * A API de reviews não faz parte do googleapis bundle — é chamada diretamente via REST.
 */
const MY_BUSINESS_API_BASE = 'https://mybusiness.googleapis.com/v4';

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

  // ─── Token management ────────────────────────────────────────────────────────

  async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const token = await this.prisma.googleToken.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!token) {
      throw new UnauthorizedException(
        'Token do Google não encontrado. Faça login novamente.',
      );
    }

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt.getTime(),
    });

    // Renova automaticamente se expirado
    if (token.expiresAt.getTime() < Date.now()) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();

        await this.prisma.googleToken.update({
          where: { id: token.id },
          data: {
            accessToken: credentials.access_token ?? token.accessToken,
            refreshToken: credentials.refresh_token ?? token.refreshToken,
            expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
          },
        });

        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        this.logger.error('Erro ao renovar token do Google', error);
        throw new UnauthorizedException(
          'Erro ao renovar autenticação. Faça login novamente.',
        );
      }
    }

    return this.oauth2Client;
  }

  // ─── Google Business Profile ─────────────────────────────────────────────────

  async listBusinessProfiles(userId: string): Promise<GoogleBusinessProfile[]> {
    const auth = await this.getAuthenticatedClient(userId);

    try {
      // Lista contas via mybusinessaccountmanagement v1
      const accountMgmt = google.mybusinessaccountmanagement({ version: 'v1', auth });
      const accountsResponse = await accountMgmt.accounts.list();
      const accounts = accountsResponse.data.accounts ?? [];

      const profiles: GoogleBusinessProfile[] = [];

      for (const account of accounts) {
        if (!account.name) continue;

        // Lista locais via mybusinessbusinessinformation v1
        const bizInfo = google.mybusinessbusinessinformation({ version: 'v1', auth });
        const locationsResponse = await bizInfo.accounts.locations.list({
          parent: account.name,
          readMask: 'name,title',
        });

        for (const location of locationsResponse.data.locations ?? []) {
          if (location.name && location.title) {
            profiles.push({
              name: location.name,
              title: location.title,
              locationId: location.name.split('/').pop() ?? '',
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

  // ─── Reviews ─────────────────────────────────────────────────────────────────

  /**
   * Busca avaliações de um local do Google Business Profile.
   *
   * Usa chamada REST direta pois a My Business Reviews API v4 não está
   * disponível no googleapis bundle — o SDK não expõe `google.mybusiness`.
   *
   * Ref: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
   *
   * @param userId    ID do usuário no sistema (para recuperar token OAuth)
   * @param locationName  Path do local no formato "accounts/{accountId}/locations/{locationId}"
   */
  async fetchReviews(userId: string, locationName: string): Promise<GoogleReview[]> {
    const auth = await this.getAuthenticatedClient(userId);

    try {
      const url = `${MY_BUSINESS_API_BASE}/${locationName}/reviews?pageSize=50`;
      const response = await auth.request<MyBusinessReviewsResponse>({ url });
      const reviews = response.data.reviews ?? [];

      return reviews.map((review) => ({
        reviewId: review.reviewId ?? review.name?.split('/').pop() ?? '',
        reviewerName: review.reviewer?.displayName ?? 'Anônimo',
        rating: this.parseRating(review.starRating ?? ''),
        comment: review.comment ?? null,
        createTime: review.createTime ?? new Date().toISOString(),
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar avaliações do Google Business', error);
      throw error;
    }
  }

  // ─── Replies ─────────────────────────────────────────────────────────────────

  /**
   * Publica ou atualiza uma resposta a uma avaliação.
   *
   * Usa chamada REST direta pelo mesmo motivo que fetchReviews.
   *
   * Ref: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply
   *
   * @param userId        ID do usuário (para recuperar token OAuth)
   * @param locationName  Path "accounts/{accountId}/locations/{locationId}"
   * @param reviewId      ID da avaliação no Google
   * @param replyText     Texto da resposta a publicar
   */
  async postReply(
    userId: string,
    locationName: string,
    reviewId: string,
    replyText: string,
  ): Promise<void> {
    const auth = await this.getAuthenticatedClient(userId);

    try {
      const url = `${MY_BUSINESS_API_BASE}/${locationName}/reviews/${reviewId}/reply`;

      await auth.request({
        url,
        method: 'PUT',
        data: { comment: replyText },
      });

      this.logger.log(`Resposta publicada para review ${reviewId}`);
    } catch (error) {
      this.logger.error('Erro ao publicar resposta no Google Business', error);
      throw error;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private parseRating(starRating: string): number {
    const ratingMap: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };
    return ratingMap[starRating] ?? 0;
  }
}
