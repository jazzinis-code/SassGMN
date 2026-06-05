import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GoogleService } from '../google/google.service';
import { BusinessesService } from '../businesses/businesses.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { Response, ResponseStatus, ReviewResponseStatus, AutomationMode } from '@prisma/client';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class ResponsesService {
  private readonly logger = new Logger(ResponsesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly googleService: GoogleService,
    private readonly businessesService: BusinessesService,
    private readonly audit: AuditService,
  ) {}

  // ─── Generate ────────────────────────────────────────────────────────────────

  async generateResponse(reviewId: string, userId: string): Promise<Response> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { business: true },
    });

    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (review.business.userId !== userId) throw new ForbiddenException('Acesso negado');

    const generatedText = await this.aiService.generateReviewResponse({
      businessName: review.business.name,
      businessSegment: review.business.segment ?? '',
      businessCity: review.business.city ?? '',
      businessServices: review.business.mainServices,
      toneOfVoice: review.business.toneOfVoice ?? 'profissional e amigável',
      keywords: review.business.keywords,
      avoidTerms: review.business.avoidTerms,
      responseTemplate: review.business.responseTemplate ?? undefined,
      reviewerName: review.reviewerName,
      rating: review.rating,
      comment: review.comment ?? '',
    });

    const response = await this.prisma.response.create({
      data: {
        reviewId,
        generatedText,
        status: ResponseStatus.DRAFT,
      },
    });

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { responseStatus: ReviewResponseStatus.GENERATED },
    });

    await this.audit.log(userId, AuditAction.RESPONSE_GENERATED, {
      reviewId,
      responseId: response.id,
      businessId: review.businessId,
      rating: review.rating,
      automationMode: review.business.automationMode,
    });

    const mode = review.business.automationMode;

    // AUTO: gera, aprova e publica automaticamente para todas as notas
    if (mode === AutomationMode.AUTO) {
      this.logger.log(`[AUTO] Publicando resposta automaticamente — review ${reviewId}`);
      return this.approveAndPublish(response.id, userId);
    }

    // SEMI_AUTO: publica automaticamente somente para avaliações positivas (4-5 estrelas)
    // Avaliações negativas (1-3 estrelas) permanecem como DRAFT para revisão manual
    if (mode === AutomationMode.SEMI_AUTO && review.rating >= 4) {
      this.logger.log(
        `[SEMI_AUTO] Nota ${review.rating}★ — publicando automaticamente — review ${reviewId}`,
      );
      return this.approveAndPublish(response.id, userId);
    }

    if (mode === AutomationMode.SEMI_AUTO && review.rating < 4) {
      this.logger.log(
        `[SEMI_AUTO] Nota ${review.rating}★ — aguardando revisão manual — review ${reviewId}`,
      );
    }

    return response;
  }

  // ─── Approve ─────────────────────────────────────────────────────────────────

  async approve(responseId: string, userId: string, publishedText?: string): Promise<Response> {
    const response = await this.getResponseWithOwnershipCheck(responseId, userId);

    if (response.status !== ResponseStatus.DRAFT) {
      throw new BadRequestException('Resposta já foi processada');
    }

    const updated = await this.prisma.response.update({
      where: { id: responseId },
      data: {
        status: ResponseStatus.APPROVED,
        publishedText: publishedText ?? response.generatedText,
      },
    });

    await this.audit.log(userId, AuditAction.RESPONSE_APPROVED, { responseId });
    return updated;
  }

  // ─── Reject ──────────────────────────────────────────────────────────────────

  async reject(responseId: string, userId: string): Promise<Response> {
    const response = await this.getResponseWithOwnershipCheck(responseId, userId);

    if (response.status !== ResponseStatus.DRAFT) {
      throw new BadRequestException('Resposta já foi processada');
    }

    const updated = await this.prisma.response.update({
      where: { id: responseId },
      data: { status: ResponseStatus.REJECTED },
    });

    await this.prisma.review.update({
      where: { id: response.reviewId },
      data: { responseStatus: ReviewResponseStatus.REJECTED },
    });

    await this.audit.log(userId, AuditAction.RESPONSE_REJECTED, { responseId });
    return updated;
  }

  // ─── Publish ─────────────────────────────────────────────────────────────────

  async publish(responseId: string, userId: string): Promise<Response> {
    const response = await this.getResponseWithOwnershipCheck(responseId, userId);

    if (response.status !== ResponseStatus.APPROVED) {
      throw new BadRequestException('Resposta precisa ser aprovada antes de publicar');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: response.reviewId },
      include: { business: true },
    });

    if (!review?.googleReviewId || !review.business.googleProfileId) {
      throw new BadRequestException(
        'Avaliação sem dados do Google para publicar. Verifique se o perfil Google está vinculado.',
      );
    }

    const textToPublish = response.publishedText ?? response.generatedText;

    await this.googleService.postReply(
      userId,
      review.business.googleProfileId,
      review.googleReviewId,
      textToPublish,
    );

    const updated = await this.prisma.response.update({
      where: { id: responseId },
      data: {
        status: ResponseStatus.PUBLISHED,
        publishedText: textToPublish,
        publishedAt: new Date(),
      },
    });

    await this.prisma.review.update({
      where: { id: response.reviewId },
      data: { responseStatus: ReviewResponseStatus.PUBLISHED },
    });

    await this.audit.log(userId, AuditAction.RESPONSE_PUBLISHED, {
      responseId,
      reviewId: response.reviewId,
      googleReviewId: review.googleReviewId,
    });

    return updated;
  }

  async approveAndPublish(responseId: string, userId: string): Promise<Response> {
    await this.approve(responseId, userId);
    return this.publish(responseId, userId);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findByReview(reviewId: string, userId: string): Promise<Response[]> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { business: true },
    });

    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (review.business.userId !== userId) throw new ForbiddenException('Acesso negado');

    return this.prisma.response.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista todas as respostas do usuário usando JOIN direto — evita N+1.
   */
  async findAll(userId: string, pagination: PaginationDto): Promise<PaginatedResponseDto<Response>> {
    const where = {
      review: {
        business: { userId },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.response.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          review: {
            include: {
              business: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.response.count({ where }),
    ]);

    return new PaginatedResponseDto(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getResponseWithOwnershipCheck(
    responseId: string,
    userId: string,
  ): Promise<Response> {
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      include: {
        review: { include: { business: true } },
      },
    });

    if (!response) throw new NotFoundException('Resposta não encontrada');

    const review = (response as Response & { review: { business: { userId: string } } }).review;
    if (review.business.userId !== userId) throw new ForbiddenException('Acesso negado');

    return response;
  }
}
