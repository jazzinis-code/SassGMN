import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface DashboardStats {
  /** Totais gerais */
  totalReviews: number;
  totalBusinesses: number;
  totalResponses: number;

  /** Por status de resposta */
  pendingReviews: number;
  generatedReviews: number;
  publishedResponses: number;
  rejectedResponses: number;

  /** Qualidade */
  averageRating: number;
  averageResponseTimeHours: number | null;

  /** Distribuição de notas: { "1": n, "2": n, ..., "5": n } */
  ratingDistribution: Record<string, number>;

  /** Últimos 7 dias */
  newReviewsLast7Days: number;
  publishedLast7Days: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string): Promise<DashboardStats> {
    // IDs das empresas do usuário — ponto de acesso central para todas as queries
    const businesses = await this.prisma.business.findMany({
      where: { userId },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      return this.emptyStats();
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Todas as queries em paralelo — uma única roundtrip ao banco
    const [
      totalReviews,
      pendingReviews,
      generatedReviews,
      publishedResponses,
      rejectedResponses,
      totalBusinesses,
      totalResponses,
      ratingAgg,
      ratingGroups,
      newReviewsLast7Days,
      publishedLast7Days,
      responseTimes,
    ] = await Promise.all([
      // Contagens de reviews por status
      this.prisma.review.count({ where: { businessId: { in: businessIds } } }),
      this.prisma.review.count({ where: { businessId: { in: businessIds }, responseStatus: 'PENDING' } }),
      this.prisma.review.count({ where: { businessId: { in: businessIds }, responseStatus: 'GENERATED' } }),
      this.prisma.review.count({ where: { businessId: { in: businessIds }, responseStatus: 'PUBLISHED' } }),
      this.prisma.review.count({ where: { businessId: { in: businessIds }, responseStatus: 'REJECTED' } }),

      // Empresas e respostas
      this.prisma.business.count({ where: { userId } }),
      this.prisma.response.count({
        where: { review: { businessId: { in: businessIds } } },
      }),

      // Média de rating
      this.prisma.review.aggregate({
        where: { businessId: { in: businessIds } },
        _avg: { rating: true },
      }),

      // Distribuição de notas (1-5) — group by
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { businessId: { in: businessIds } },
        _count: { rating: true },
        orderBy: { rating: 'asc' },
      }),

      // Novos reviews nos últimos 7 dias
      this.prisma.review.count({
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // Respostas publicadas nos últimos 7 dias
      this.prisma.response.count({
        where: {
          review: { businessId: { in: businessIds } },
          status: 'PUBLISHED',
          publishedAt: { gte: sevenDaysAgo },
        },
      }),

      // Tempo médio de resposta: pega pares (reviewDate, publishedAt)
      // Limitado a 200 registros para não sobrecarregar em volumes altos
      this.prisma.response.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { not: null },
          review: { businessId: { in: businessIds } },
        },
        select: {
          publishedAt: true,
          review: { select: { reviewDate: true } },
        },
        take: 200,
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    // Calcula tempo médio de resposta em horas
    const averageResponseTimeHours = this.calcAverageResponseTime(responseTimes);

    // Formata distribuição de notas
    const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const group of ratingGroups) {
      ratingDistribution[String(group.rating)] = group._count.rating;
    }

    return {
      totalReviews,
      totalBusinesses,
      totalResponses,
      pendingReviews,
      generatedReviews,
      publishedResponses,
      rejectedResponses,
      averageRating: Number((ratingAgg._avg.rating ?? 0).toFixed(1)),
      averageResponseTimeHours,
      ratingDistribution,
      newReviewsLast7Days,
      publishedLast7Days,
    };
  }

  private calcAverageResponseTime(
    pairs: { publishedAt: Date | null; review: { reviewDate: Date } }[],
  ): number | null {
    const valid = pairs.filter((p) => p.publishedAt != null);
    if (valid.length === 0) return null;

    const totalMs = valid.reduce((acc, p) => {
      const diff = (p.publishedAt as Date).getTime() - p.review.reviewDate.getTime();
      return acc + Math.max(0, diff); // evita negativos por dados inconsistentes
    }, 0);

    const avgMs = totalMs / valid.length;
    return Number((avgMs / (1000 * 60 * 60)).toFixed(1)); // horas com 1 decimal
  }

  private emptyStats(): DashboardStats {
    return {
      totalReviews: 0,
      totalBusinesses: 0,
      totalResponses: 0,
      pendingReviews: 0,
      generatedReviews: 0,
      publishedResponses: 0,
      rejectedResponses: 0,
      averageRating: 0,
      averageResponseTimeHours: null,
      ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      newReviewsLast7Days: 0,
      publishedLast7Days: 0,
    };
  }
}
