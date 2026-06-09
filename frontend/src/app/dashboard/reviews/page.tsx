'use client';

import React, { useState } from 'react';
import { useReviews, useSyncReviews } from '@/hooks/useReviews';
import { useBusinesses } from '@/hooks/useBusinesses';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewFilters } from '@/components/reviews/ReviewFilters';
import { Button } from '@/components/ui/Button';
import { RefreshCw, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import type { FilterReviewsDto } from '@/types';

interface SyncResult {
  message: string;
  created: number;
  updated: number;
  total: number;
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterReviewsDto>({});
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data: reviewsData, isLoading } = useReviews({ ...filters, page, limit: 10 });
  const { data: businessesData } = useBusinesses(1, 100);
  const syncMutation = useSyncReviews();

  const businesses = businessesData?.data ?? [];
  // Empresas com perfil Google vinculado
  const linkedBusinesses = businesses.filter((b) => b.googleProfileId && b.isActive);

  const handleFiltersChange = (newFilters: FilterReviewsDto) => {
    setFilters(newFilters);
    setPage(1);
    setSyncResult(null);
    setSyncError(null);
  };

  const handleSync = (businessId?: string) => {
    const targetId = businessId ?? filters.businessId;
    if (!targetId) return;

    setSyncResult(null);
    setSyncError(null);

    syncMutation.mutate(targetId, {
      onSuccess: (data) => {
        setSyncResult(data);
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.message ??
          'Erro ao sincronizar. Verifique se o perfil Google está vinculado.';
        setSyncError(msg);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avaliações</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualize e gerencie todas as avaliações dos seus perfis do Google
          </p>
        </div>

        {/* Botão de sync para empresa filtrada */}
        {filters.businessId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSync()}
            isLoading={syncMutation.isPending}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        )}
      </div>

      {/* Feedback de sincronização */}
      {syncResult && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">{syncResult.message}</p>
            <div className="flex gap-4 mt-1 text-xs text-green-700">
              <span>✦ {syncResult.created} nova(s)</span>
              <span>↻ {syncResult.updated} atualizada(s)</span>
              <span>Total: {syncResult.total}</span>
            </div>
          </div>
          <button
            onClick={() => setSyncResult(null)}
            className="ml-auto text-green-500 hover:text-green-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {syncError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{syncError}</p>
          <button
            onClick={() => setSyncError(null)}
            className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Sync rápido — empresas vinculadas (quando não há filtro ativo) */}
      {!filters.businessId && linkedBusinesses.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-700">Sincronizar por empresa</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {linkedBusinesses.map((b) => (
              <Button
                key={b.id}
                variant="secondary"
                size="sm"
                onClick={() => handleSync(b.id)}
                isLoading={syncMutation.isPending && syncMutation.variables === b.id}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                {b.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Sem empresas vinculadas */}
      {!filters.businessId && linkedBusinesses.length === 0 && businesses.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Nenhuma empresa com perfil Google vinculado.</strong>{' '}
            Vá em <strong>Empresas</strong> → selecione uma empresa → vincule um perfil Google para sincronizar avaliações.
          </p>
        </div>
      )}

      <ReviewFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        businesses={businesses}
      />

      <ReviewList
        data={reviewsData}
        isLoading={isLoading}
        currentPage={page}
        onPageChange={setPage}
      />
    </div>
  );
}
