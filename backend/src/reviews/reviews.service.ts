import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { GoogleService } from '../google/google.service';
import { Review, Prisma, ReviewResponseStatus } from '@prisma/client';
import { FilterReviewsDto } from './dto/filter-reviews.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly googleService: GoogleService,
    @InjectQueue('reviews-sync') private readonly syncQueue: Queue,
  ) {}

  async findAll(
    userId: string,
    filters: FilterReviewsDto,
  ): Promise<PaginatedResponseDto<Review>> {
    const userBusinessIds = await this.getUserBusinessIds(userId);

    const where: Prisma.ReviewWhereInput = {
      businessId: filters.businessId
        ? { equals: filters.businessId }
        : { in: userBusinessIds },
    };

    if (filters.minRating) {
      where.rating = { ...((where.rating as Prisma.IntFilter) || {}), gte: filters.minRating };
    }
    if (filters.maxRating) {
      where.rating = { ...((where.rating as Prisma.IntFilter) || {}), lte: filters.maxRating };
    }
    if (filters.responseStatus) {
      where.responseStatus = filters.responseStatus;
    }
    if (filters.reviewerName) {
      where.reviewerName = { contains: filters.reviewerName, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { reviewDate: 'desc' },
        include: {
          business: { select: { id: true, name: true } },
          responses: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return new PaginatedResponseDto(
      data,
      total,
      filters.page || 1,
      filters.limit || 20,
    );
  }

  async findById(id: string, userId: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        business: true,
        responses: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!review) {
      throw new NotFoundException('Avaliacao nao encontrada');
    }

    const userBusinessIds = await this.getUserBusinessIds(userId);
    if (!userBusinessIds.includes(review.businessId)) {
      throw new ForbiddenException('Acesso negado a esta avaliacao');
    }

    return review;
  }

  async syncFromGoogle(businessId: string, userId: string): Promise<{ message: string }> {
    const business = await this.businessesService.findById(businessId, userId);

    if (!business.googleProfileId) {
      throw new NotFoundException('Empresa sem perfil do Google vinculado');
    }

    await this.syncQueue.add('sync-reviews', {
      businessId: business.id,
      userId,
      googleProfileId: business.googleProfileId,
    });

    return { message: 'Sincronizacao iniciada. As avaliacoes serao atualizadas em breve.' };
  }

  async processSyncJob(businessId: string, userId: string, googleProfileId: string): Promise<void> {
    const reviews = await this.googleService.fetchReviews(userId, googleProfileId);

    for (const review of reviews) {
      const existingReview = await this.prisma.review.findUnique({
        where: { googleReviewId: review.reviewId },
      });

      if (!existingReview) {
        await this.prisma.review.create({
          data: {
            businessId,
            googleReviewId: review.reviewId,
            reviewerName: review.reviewerName,
            rating: review.rating,
            comment: review.comment || null,
            reviewDate: new Date(review.createTime),
            responseStatus: ReviewResponseStatus.PENDING,
          },
        });
      }
    }
  }

  async updateStatus(id: string, userId: string, status: string): Promise<Review> {
    await this.findById(id, userId);

    return this.prisma.review.update({
      where: { id },
      data: { responseStatus: status as ReviewResponseStatus },
    });
  }

  async getPendingReviews(businessId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: {
        businessId,
        responseStatus: ReviewResponseStatus.PENDING,
      },
      orderBy: { reviewDate: 'desc' },
    });
  }

  private async getUserBusinessIds(userId: string): Promise<string[]> {
    const businesses = await this.prisma.business.findMany({
      where: { userId },
      select: { id: true },
    });
    return businesses.map((b) => b.id);
  }
}
