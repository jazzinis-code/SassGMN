import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenCryptoService } from '../common/crypto/token-crypto.service';

export interface GoogleReview {
  reviewId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createTime: string;
  /** Resposta já publicada no Google (pode ter vindo de fora do sistema). */
  reviewReply: string | null;
}

export interface GoogleBusinessProfile {
  name: string;
  title: string;
  locationId: string;
}

/**
 * Resposta de listagem da My Business Reviews API v4.
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
 * Base URL da My Business Reviews API v4.
 * A API de reviews não faz parte do googleapis bundle — é chamada via REST direto.
 */
const MY_BUSINESS_API_BASE = 'https://mybusiness.googleapis.com/v4';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
  ) {}

  // ─── Token management ────────────────────────────────────────────────────────

  /**
   * Cria um OAuth2Client autenticado para o usuário informado.
   *
   * Um novo cliente é criado por chamada — evita condição de corrida
   * entre requisições concorrentes de usuários diferentes.
   *
   * Renova automaticamente o access_token se expirado e persiste
   * o novo token criptografado no banco.
   */
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

    // Descriptografa antes de passar ao OAuth2Client (migração transparente)
    const accessToken = this.crypto.decrypt(token.accessToken);
    const refreshToken = this.crypto.decrypt(token.refreshToken);

    const client = this.createOAuth2Client();
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: token.expiresAt.getTime(),
    });

    // Renova automaticamente se expirado
    if (token.expiresAt.getTime() < Date.now()) {
      try {
        const { credentials } = await client.refreshAccessToken();

        // Criptografa antes de persistir — só encripta se veio novo valor do Google
        const newAccessToken = credentials.access_token
          ? this.crypto.encrypt(credentials.access_token)
          : token.accessToken; // já está criptografado (ou plaintext em migração)

        const newRefreshToken = credentials.refresh_token
          ? this.crypto.encrypt(credentials.refresh_token)
          : token.refreshToken; // idem

        await this.prisma.googleToken.update({
          where: { id: token.id },
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
          },
        });

        client.setCredentials(credentials);
      } catch (error) {
        this.logger.error('Erro ao renovar token do Google', error);
        throw new UnauthorizedException(
          'Erro ao renovar autenticação. Faça login novamente.',
        );
      }
    }

    return client;
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
   * Busca TODAS as avaliações de um local do Google Business Profile.
   *
   * Percorre todas as páginas via `nextPageToken` — garante que avaliações
   * além das primeiras 50 também sejam sincronizadas.
   *
   * Usa chamada REST direta pois a My Business Reviews API v4 não está
   * disponível no googleapis bundle.
   *
   * Ref: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
   *
   * @param userId        ID do usuário (para recuperar token OAuth)
   * @param locationName  Path "accounts/{accountId}/locations/{locationId}"
   */
  async fetchReviews(userId: string, locationName: string): Promise<GoogleReview[]> {
    const auth = await this.getAuthenticatedClient(userId);

    const allReviews: GoogleReview[] = [];
    let pageToken: string | undefined;
    let page = 1;

    try {
      do {
        const params = new URLSearchParams({ pageSize: '50' });
        if (pageToken) params.set('pageToken', pageToken);

        const url = `${MY_BUSINESS_API_BASE}/${locationName}/reviews?${params.toString()}`;
        const response = await auth.request<MyBusinessReviewsResponse>({ url });

        const reviews = response.data.reviews ?? [];
        this.logger.debug(
          `fetchReviews — página ${page}: ${reviews.length} avaliação(ões) recebida(s)`,
        );

        for (const review of reviews) {
          allReviews.push({
            reviewId: review.reviewId ?? review.name?.split('/').pop() ?? '',
            reviewerName: review.reviewer?.displayName ?? 'Anônimo',
            rating: this.parseRating(review.starRating ?? ''),
            comment: review.comment ?? null,
            createTime: review.createTime ?? new Date().toISOString(),
            reviewReply: review.reviewReply?.comment ?? null,
          });
        }

        pageToken = response.data.nextPageToken;
        page++;
      } while (pageToken);

      this.logger.log(
        `fetchReviews — ${allReviews.length} avaliação(ões) total em ${page - 1} página(s)`,
      );

      return allReviews;
    } catch (error) {
      this.logger.error('Erro ao buscar avaliações do Google Business', error);
      throw error;
    }
  }

  // ─── Replies ─────────────────────────────────────────────────────────────────

  /**
   * Publica ou atualiza uma resposta a uma avaliação via REST direto.
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

  private createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      this.configService.get<string>('google.callbackUrl'),
    );
  }

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
