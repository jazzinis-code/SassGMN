import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/** Ações auditadas no sistema — manter em sync com docs/status-atual.md */
export enum AuditAction {
  // Autenticação
  USER_LOGIN        = 'USER_LOGIN',
  USER_REGISTER     = 'USER_REGISTER',

  // Negócios
  BUSINESS_CREATED  = 'BUSINESS_CREATED',
  BUSINESS_UPDATED  = 'BUSINESS_UPDATED',
  BUSINESS_DELETED  = 'BUSINESS_DELETED',

  // Avaliações
  REVIEWS_SYNC_REQUESTED  = 'REVIEWS_SYNC_REQUESTED',
  REVIEWS_SYNC_COMPLETED  = 'REVIEWS_SYNC_COMPLETED',

  // Respostas
  RESPONSE_GENERATED = 'RESPONSE_GENERATED',
  RESPONSE_APPROVED  = 'RESPONSE_APPROVED',
  RESPONSE_REJECTED  = 'RESPONSE_REJECTED',
  RESPONSE_PUBLISHED = 'RESPONSE_PUBLISHED',

  // Google
  GOOGLE_PROFILE_CONNECTED = 'GOOGLE_PROFILE_CONNECTED',
}

export interface AuditDetails {
  [key: string]: string | number | boolean | null | undefined;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ação de auditoria.
   * Nunca lança exceção — falha de auditoria não deve interromper o fluxo principal.
   */
  async log(
    userId: string,
    action: AuditAction,
    details?: AuditDetails,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (error) {
      // Log no console mas não propaga o erro — auditoria é best-effort
      this.logger.error(
        `Falha ao registrar audit log [${action}] para usuário ${userId}`,
        error,
      );
    }
  }

  /**
   * Busca o histórico de auditoria de um usuário (mais recentes primeiro).
   */
  async findByUser(
    userId: string,
    limit = 50,
  ) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
