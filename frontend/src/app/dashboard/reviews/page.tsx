'use client';

import React, { useState } from 'react';
import { useReviews } from '@/hooks/useReviews';
import { useBusinesses } from '@/hooks/useBusinesses';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewFilters } from '@/components/reviews/ReviewFilters';
import { Button } from '@/components/ui/Button';
import { useSyncReviews } from '@/hooks/useReviews';
import { RefreshCw } from 'lucide-react';
import type { FilterReviewsDto } from '@/types';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterReviewsDto>({});
  const { data: reviewsData, isLoading } = useReviews({ ...filters, page, limit: 10 });
  const { data: businessesData } = useBusinesses(1, 100);
  const syncMutation = useSyncReviews();

  const handleFiltersChange = (newFilters: FilterReviewsDto) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSync = () => {
    if (filters.businessId) {
      syncMutation.mutate(filters.businessId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avaliacoes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualize e gerencie todas as avaliacoes dos seus perfis do Google
          </p>
        </div>
        {filters.businessId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSync}
            isLoading={syncMutation.isPending}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Sincronizar
          </Button>
        )}
      </div>

      <ReviewFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        businesses={businessesData?.data || []}
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
