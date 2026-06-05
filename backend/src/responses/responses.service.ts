import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GoogleService } from '../google/google.service';
import { BusinessesService } from '../businesses/businesses.service';
import { Response, ResponseStatus, ReviewResponseStatus } from '@prisma/client';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class ResponsesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly googleService: GoogleService,
    private readonly businessesService: BusinessesService,
  ) {}

  async generateResponse(reviewId: string, userId: string): Promise<Response> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { business: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliacao nao encontrada');
    }

    // Verify ownership
    if (review.business.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    const generatedText = await this.aiService.generateReviewResponse({
      businessName: review.business.name,
      businessSegment: review.business.segment || '',
      businessCity: review.business.city || '',
      businessServices: review.business.mainServices,
      toneOfVoice: review.business.toneOfVoice || 'profissional e amigavel',
      keywords: review.business.keywords,
      avoidTerms: review.business.avoidTerms,
      responseTemplate: review.business.responseTemplate || undefined,
      reviewerName: review.reviewerName,
      rating: review.rating,
      comment: review.comment || '',
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

    // If AUTO mode, approve and publish immediately
    if (review.business.automationMode === 'AUTO') {
      return this.approveAndPublish(response.id, userId);
    }

    return response;
  }

  async approve(responseId: string, userId: string, publishedText?: string): Promise<Response> {
    const response = await this.getResponseWithOwnershipCheck(responseId, userId);

    if (response.status !== ResponseStatus.DRAFT) {
      throw new BadRequestException('Resposta ja foi processada');
    }

    return this.prisma.response.update({
      where: { id: responseId },
      data: {
        status: ResponseStatus.APPROVED,
        publishedText: publishedText || response.generatedText,
      },
    });
  }

  async reject(responseId: string, userId: string): Promise<Response> {
    const response = await this.getResponseWithOwnershipCheck(responseId, userId);

    if (response.status !== ResponseStatus.DRAFT) {
      throw new BadRequestException('Resposta ja foi processada');
    }

    const updated = await this.prisma.response.update({
      where: { id: responseId },
      data: { status: ResponseStatus.REJECTED },
    });

    await this.prisma.review.update({
      where: { id: response.reviewId },
      data: { responseStatus: ReviewResponseStatus.REJECTED },
    });

    return updated;
  }

  async publish(responseId: string, userId: string): Promise<Response> {
    const response = await this.getResponseWithOwnershipCheck(responseId, userId);

    if (response.status !== ResponseStatus.APPROVED) {
      throw new BadRequestException('Resposta precisa ser aprovada antes de publicar');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: response.reviewId },
      include: { business: true },
    });

    if (!review || !review.googleReviewId || !review.business.googleProfileId) {
      throw new BadRequestException('Avaliacao sem dados do Google para publicar');
    }

    const textToPublish = response.publishedText || response.generatedText;

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

    return updated;
  }

  async approveAndPublish(responseId: string, userId: string): Promise<Response> {
    await this.approve(responseId, userId);
    return this.publish(responseId, userId);
  }

  async findByReview(reviewId: string, userId: string): Promise<Response[]> {
    // Ownership check via review
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { business: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliacao nao encontrada');
    }

    if (review.business.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.response.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userId: string, pagination: PaginationDto): Promise<PaginatedResponseDto<Response>> {
    const businesses = await this.prisma.business.findMany({
      where: { userId },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    const reviews = await this.prisma.review.findMany({
      where: { businessId: { in: businessIds } },
      select: { id: true },
    });
    const reviewIds = reviews.map((r) => r.id);

    const where = { reviewId: { in: reviewIds } };

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
      pagination.page || 1,
      pagination.limit || 20,
    );
  }

  private async getResponseWithOwnershipCheck(responseId: string, userId: string): Promise<Response> {
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      include: {
        review: {
          include: { business: true },
        },
      },
    });

    if (!response) {
      throw new NotFoundException('Resposta nao encontrada');
    }

    const review = (response as any).review;
    if (review.business.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return response;
  }
}
