'use client';

import React from 'react';
import { ReviewCard } from './ReviewCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Table';
import { MessageSquare } from 'lucide-react';
import type { Review, PaginatedResponse } from '@/types';

interface ReviewListProps {
  data?: PaginatedResponse<Review>;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function ReviewList({
  data,
  isLoading,
  currentPage,
  onPageChange,
}: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-8 h-8 text-gray-400" />}
        title="Nenhuma avaliacao encontrada"
        description="Quando novas avaliacoes forem sincronizadas do Google, elas aparecerao aqui."
      />
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {data.data.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {data.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={data.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
