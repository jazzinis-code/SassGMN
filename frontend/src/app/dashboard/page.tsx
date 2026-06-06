'use client';

import React from 'react';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useReviews } from '@/hooks/useReviews';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentReviews } from '@/components/dashboard/RecentReviews';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import Link from 'next/link';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Building2,
  Plus,
  ArrowRight,
  Star,
  Timer,
  TrendingUp,
  Send,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: reviewsData, isLoading: reviewsLoading } = useReviews({ limit: 5 });

  const isLoading = statsLoading || reviewsLoading;

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const avgRatingLabel = stats?.averageRating
    ? `${stats.averageRating} / 5`
    : '—';

  const avgResponseLabel = stats?.averageResponseTimeHours != null
    ? stats.averageResponseTimeHours < 24
      ? `${stats.averageResponseTimeHours}h`
      : `${(stats.averageResponseTimeHours / 24).toFixed(1)}d`
    : '—';

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/dashboard/businesses/new">
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Nova empresa
          </Button>
        </Link>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de avaliações"
          value={stats?.totalReviews ?? 0}
          icon={<MessageSquare className="w-6 h-6 text-brand-600" />}
          description={`+${stats?.newReviewsLast7Days ?? 0} nos últimos 7 dias`}
        />
        <StatsCard
          title="Pendentes"
          value={stats?.pendingReviews ?? 0}
          icon={<Clock className="w-6 h-6 text-yellow-600" />}
        />
        <StatsCard
          title="Publicadas"
          value={stats?.publishedResponses ?? 0}
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
          description={`+${stats?.publishedLast7Days ?? 0} nos últimos 7 dias`}
        />
        <StatsCard
          title="Empresas"
          value={stats?.totalBusinesses ?? 0}
          icon={<Building2 className="w-6 h-6 text-indigo-600" />}
        />
      </div>

      {/* Stats secundárias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Nota média"
          value={avgRatingLabel}
          icon={<Star className="w-6 h-6 text-amber-500" />}
        />
        <StatsCard
          title="Tempo médio de resposta"
          value={avgResponseLabel}
          icon={<Timer className="w-6 h-6 text-blue-500" />}
        />
        <StatsCard
          title="Respostas geradas"
          value={stats?.generatedReviews ?? 0}
          icon={<TrendingUp className="w-6 h-6 text-purple-500" />}
        />
        <StatsCard
          title="Total de respostas"
          value={stats?.totalResponses ?? 0}
          icon={<Send className="w-6 h-6 text-teal-500" />}
        />
      </div>

      {/* Distribuição de notas */}
      {stats && (
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">Distribuição de notas</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[String(star)] ?? 0;
                const pct = stats.totalReviews > 0
                  ? Math.round((count / stats.totalReviews) * 100)
                  : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-12 text-sm text-gray-600 shrink-0">{star} ★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-sm text-gray-500 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews recentes + ações rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentReviews
            reviews={Array.isArray(reviewsData?.data) ? reviewsData.data : []}
            isLoading={reviewsLoading}
          />
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">Ações rápidas</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { href: '/dashboard/reviews', label: 'Ver todas as avaliações' },
              { href: '/dashboard/responses', label: 'Histórico de respostas' },
              { href: '/dashboard/businesses', label: 'Gerenciar empresas' },
              { href: '/dashboard/settings', label: 'Configurações' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
