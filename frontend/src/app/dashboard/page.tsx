'use client';

import React, { useState } from 'react';
import { useDashboardStats, useDashboardCharts } from '@/hooks/useDashboard';
import { useReviews } from '@/hooks/useReviews';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentReviews } from '@/components/dashboard/RecentReviews';
import { ReviewsBarChart } from '@/components/dashboard/ReviewsBarChart';
import { StatusDonutChart } from '@/components/dashboard/StatusDonutChart';
import { RatingTrendChart } from '@/components/dashboard/RatingTrendChart';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import Link from 'next/link';
import {
  MessageSquare, Clock, CheckCircle2, Building2,
  Plus, ArrowRight, Star, Timer, TrendingUp, Send,
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function DashboardPage() {
  const [chartDays, setChartDays] = useState(30);

  const { data: stats,  isLoading: statsLoading  } = useDashboardStats();
  const { data: charts, isLoading: chartsLoading } = useDashboardCharts(chartDays);
  const { data: reviewsData, isLoading: reviewsLoading } = useReviews({ limit: 5 });

  const isLoading = statsLoading;

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
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

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do seu negócio</p>
        </div>
        <Link href="/dashboard/businesses/new">
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Nova empresa
          </Button>
        </Link>
      </div>

      {/* ── Stats principais ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de avaliações"
          value={stats?.totalReviews ?? 0}
          icon={<MessageSquare className="w-6 h-6 text-brand-600" />}
          description={`+${stats?.newReviewsLast7Days ?? 0} nos últimos 7 dias`}
        />
        <StatsCard
          title="Pendentes"
          value={stats?.pendingReviews ?? 0}
          icon={<Clock className="w-6 h-6 text-yellow-500" />}
          description="Aguardando resposta"
        />
        <StatsCard
          title="Publicadas"
          value={stats?.publishedResponses ?? 0}
          icon={<CheckCircle2 className="w-6 h-6 text-green-500" />}
          description={`+${stats?.publishedLast7Days ?? 0} nos últimos 7 dias`}
        />
        <StatsCard
          title="Empresas"
          value={stats?.totalBusinesses ?? 0}
          icon={<Building2 className="w-6 h-6 text-indigo-500" />}
        />
      </div>

      {/* ── Stats secundárias ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── Seletor de período dos gráficos ───────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Período:</span>
        {PERIOD_OPTIONS.map(({ label, days }) => (
          <button
            key={days}
            onClick={() => setChartDays(days)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              chartDays === days
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        {chartsLoading && <Spinner size="sm" />}
      </div>

      {/* ── Gráficos ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Barras: avaliações + publicadas por dia */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">
              Avaliações recebidas vs. Respostas publicadas
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Últimos {chartDays} dias</p>
          </CardHeader>
          <CardContent className="pt-2">
            {charts ? (
              <ReviewsBarChart data={charts.dailyReviews} />
            ) : (
              <div className="flex justify-center h-[220px] items-center">
                <Spinner />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rosca: status das respostas */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">Status das avaliações</h3>
            <p className="text-xs text-gray-400 mt-0.5">Total acumulado</p>
          </CardHeader>
          <CardContent className="pt-2">
            {charts ? (
              <StatusDonutChart data={charts.responseStatusBreakdown} />
            ) : (
              <div className="flex justify-center h-[220px] items-center">
                <Spinner />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Linha + Distribuição de notas ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tendência da nota média */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">Tendência da nota média</h3>
            <p className="text-xs text-gray-400 mt-0.5">Últimos {chartDays} dias</p>
          </CardHeader>
          <CardContent className="pt-2">
            {charts ? (
              <RatingTrendChart data={charts.dailyReviews} />
            ) : (
              <div className="flex justify-center h-[200px] items-center">
                <Spinner />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de notas (barras horizontais) */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">Distribuição de notas</h3>
            <p className="text-xs text-gray-400 mt-0.5">Total acumulado</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.ratingDistribution[String(star)] ?? 0;
                const pct = stats?.totalReviews
                  ? Math.round((count / stats.totalReviews) * 100)
                  : 0;
                const colorMap: Record<number, string> = {
                  5: 'bg-green-400',
                  4: 'bg-lime-400',
                  3: 'bg-yellow-400',
                  2: 'bg-orange-400',
                  1: 'bg-red-400',
                };
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-8 text-sm text-gray-500 text-right shrink-0">{star} ★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${colorMap[star]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-6 text-sm font-medium text-gray-700 text-right">{count}</span>
                      <span className="text-xs text-gray-400 w-8">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Reviews recentes + Ações rápidas ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentReviews
            reviews={reviewsData?.data ?? []}
            isLoading={reviewsLoading}
          />
        </div>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">Ações rápidas</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/dashboard/reviews',    label: 'Ver todas as avaliações'  },
              { href: '/dashboard/responses',  label: 'Histórico de respostas'   },
              { href: '/dashboard/businesses', label: 'Gerenciar empresas'       },
              { href: '/dashboard/settings',   label: 'Configurações'            },
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
