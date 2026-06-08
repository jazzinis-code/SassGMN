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

/** Cache em memória para perfis Google Business (evita estourar quota) */
interface ProfileCache {
  profiles: GoogleBusinessProfile[];
  expiresAt: number;
}

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly oauth2Client: OAuth2Client;
  private readonly profilesCache = new Map<string, ProfileCache>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

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
      refresh_token: token.refreshToken ?? undefined,
      expiry_date: token.expiresAt.getTime(),
    });

    // Renova automaticamente se expirado e se há refreshToken disponível
    if (token.expiresAt.getTime() < Date.now()) {
      if (!token.refreshToken) {
        throw new UnauthorizedException(
          'Sessão expirada. Faça login novamente para renovar o acesso.',
        );
      }

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

  /**
   * Lista todos os perfis Google Business do usuário via REST direto.
   *
   * APIs usadas:
   *  - Business Account Management v1: https://mybusinessaccountmanagement.googleapis.com/v1/accounts
   *  - Business Information v1: https://mybusinessbusinessinformation.googleapis.com/v1/{account}/locations
   *
   * Usamos REST direto (auth.request) porque o googleapis bundle @130
   * não expõe mybusinessaccountmanagement nem mybusinessbusinessinformation
   * como métodos tipados — igual ao padrão já adotado em fetchReviews.
   */
  async listBusinessProfiles(userId: string): Promise<GoogleBusinessProfile[]> {
    // Retorna do cache se ainda válido
    const cached = this.profilesCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`Cache hit: perfis Google para userId=${userId}`);
      return cached.profiles;
    }

    const auth = await this.getAuthenticatedClient(userId);

    try {
      // 1. Listar contas Google Business
      const accountsRes = await auth.request<{ accounts?: Array<{ name: string; accountName: string }> }>({
        url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      });

      const accounts = accountsRes.data.accounts ?? [];

      if (accounts.length === 0) {
        this.logger.warn(`Nenhuma conta Google Business encontrada para userId=${userId}`);
        return [];
      }

      this.logger.log(`Encontradas ${accounts.length} conta(s) Google Business para userId=${userId}`);

      const profiles: GoogleBusinessProfile[] = [];

      // 2. Para cada conta, listar os locais (locations)
      for (const account of accounts) {
        if (!account.name) continue;

        try {
          const locRes = await auth.request<{
            locations?: Array<{ name: string; title: string }>;
          }>({
            url: `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
          });

          for (const location of locRes.data.locations ?? []) {
            if (location.name && location.title) {
              profiles.push({
                name: location.name,
                title: location.title,
                locationId: location.name.split('/').pop() ?? '',
              });
            }
          }
        } catch (locErr: any) {
          const locStatus = locErr?.response?.status;
          const locMsg = locErr?.response?.data?.error?.message ?? locErr?.message;
          this.logger.warn(
            `Erro ao listar locais da conta ${account.name} (HTTP ${locStatus}): ${locMsg}`,
          );
        }
      }

      this.logger.log(`Total de perfis encontrados: ${profiles.length}`);

      // Salva no cache
      this.profilesCache.set(userId, {
        profiles,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return profiles;

    } catch (error: any) {
      const status = error?.response?.status ?? error?.code;
      const message = error?.response?.data?.error?.message ?? error?.message ?? 'Erro desconhecido';

      this.logger.error(
        `Erro ao listar perfis Google Business (userId=${userId}) — HTTP ${status}: ${message}`,
      );

      if (status === 403) {
        throw Object.assign(
          new Error(
            `Permissão negada (403): ${message}. Verifique se as APIs "Business Profile API" e "My Business Account Management API" estão habilitadas no Google Cloud Console.`,
          ),
          { statusCode: 403, googleApiError: true },
        );
      }

      if (status === 401) {
        throw new UnauthorizedException(
          'Token do Google expirado. Faça login novamente.',
        );
      }

      throw error;
    }
  }

  /**
   * Verifica se o usuário tem token Google válido e retorna seu status.
   * Útil para diagnóstico no frontend antes de abrir o picker.
   */
  async getTokenStatus(userId: string): Promise<{
    hasToken: boolean;
    hasRefreshToken: boolean;
    isExpired: boolean;
    expiresAt?: string;
  }> {
    const token = await this.prisma.googleToken.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!token) {
      return { hasToken: false, hasRefreshToken: false, isExpired: true };
    }

    return {
      hasToken: true,
      hasRefreshToken: !!token.refreshToken,
      isExpired: token.expiresAt.getTime() < Date.now(),
      expiresAt: token.expiresAt.toISOString(),
    };
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
