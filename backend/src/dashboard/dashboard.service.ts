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

  // ─── Chart data ──────────────────────────────────────────────────────────────

  async getChartData(userId: string, days: number) {
    const businesses = await this.prisma.business.findMany({
      where: { userId },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      return { dailyReviews: [], responseStatusBreakdown: [], ratingTrend: [] };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Busca reviews no período para calcular séries diárias
    const reviews = await this.prisma.review.findMany({
      where: {
        businessId: { in: businessIds },
        createdAt: { gte: since },
      },
      select: { createdAt: true, rating: true, responseStatus: true },
      orderBy: { createdAt: 'asc' },
    });

    // Busca respostas publicadas no período
    const responses = await this.prisma.response.findMany({
      where: {
        review: { businessId: { in: businessIds } },
        status: 'PUBLISHED',
        publishedAt: { gte: since },
      },
      select: { publishedAt: true },
    });

    // ── Série diária: reviews recebidas + respostas publicadas por dia
    const dailyMap = new Map<string, { reviews: number; responses: number; avgRating: number; ratingSum: number }>();

    // Inicializa todos os dias do período
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { reviews: 0, responses: 0, avgRating: 0, ratingSum: 0 });
    }

    for (const r of reviews) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.reviews++;
        entry.ratingSum += r.rating;
        entry.avgRating = Number((entry.ratingSum / entry.reviews).toFixed(1));
      }
    }

    for (const r of responses) {
      if (!r.publishedAt) continue;
      const key = r.publishedAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) entry.responses++;
    }

    const dailyReviews = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      reviews: v.reviews,
      responses: v.responses,
      avgRating: v.reviews > 0 ? v.avgRating : null,
    }));

    // ── Breakdown de status (para gráfico de rosca)
    const statusCounts = await this.prisma.review.groupBy({
      by: ['responseStatus'],
      where: { businessId: { in: businessIds } },
      _count: { responseStatus: true },
    });

    const STATUS_LABELS: Record<string, string> = {
      PENDING:   'Pendente',
      GENERATED: 'Gerada',
      APPROVED:  'Aprovada',
      PUBLISHED: 'Publicada',
      REJECTED:  'Rejeitada',
    };

    const responseStatusBreakdown = statusCounts.map((s) => ({
      status: s.responseStatus,
      label: STATUS_LABELS[s.responseStatus] ?? s.responseStatus,
      count: s._count.responseStatus,
    }));

    return { dailyReviews, responseStatusBreakdown };
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
