'use client';

import React from 'react';
import { useReviews } from '@/hooks/useReviews';
import { useBusinesses } from '@/hooks/useBusinesses';
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
} from 'lucide-react';

export default function DashboardPage() {
  const { data: reviewsData, isLoading: reviewsLoading } = useReviews({ limit: 5 });
  const { data: businessesData, isLoading: businessesLoading } = useBusinesses();

  const isLoading = reviewsLoading || businessesLoading;

  const totalReviews = reviewsData?.total || 0;
  const pendingReviews = reviewsData?.data?.filter(
    (r) => r.responseStatus === 'PENDING'
  ).length || 0;
  const publishedReviews = reviewsData?.data?.filter(
    (r) => r.responseStatus === 'PUBLISHED'
  ).length || 0;
  const totalBusinesses = businessesData?.total || 0;

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/businesses/new">
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Nova empresa
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de avaliacoes"
          value={totalReviews}
          icon={<MessageSquare className="w-6 h-6 text-brand-600" />}
        />
        <StatsCard
          title="Pendentes"
          value={pendingReviews}
          icon={<Clock className="w-6 h-6 text-yellow-600" />}
        />
        <StatsCard
          title="Publicadas"
          value={publishedReviews}
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
        />
        <StatsCard
          title="Empresas"
          value={totalBusinesses}
          icon={<Building2 className="w-6 h-6 text-indigo-600" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentReviews
            reviews={reviewsData?.data || []}
            isLoading={reviewsLoading}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-gray-900">
              Acoes rapidas
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/reviews"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                Ver todas as avaliacoes
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/dashboard/responses"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                Historico de respostas
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/dashboard/businesses"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                Gerenciar empresas
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                Configuracoes
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
