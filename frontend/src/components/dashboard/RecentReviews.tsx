'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelative, truncateText } from '@/lib/utils';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { Review } from '@/types';

interface RecentReviewsProps {
  reviews: Review[];
  isLoading: boolean;
}

export function RecentReviews({ reviews, isLoading }: RecentReviewsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Avaliacoes recentes
        </h3>
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          Ver todas
          <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-6 h-6 text-gray-400" />}
            title="Sem avaliacoes"
            description="Nenhuma avaliacao recente encontrada"
          />
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 5).map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.id}`}
                className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {review.reviewerName}
                    </p>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {truncateText(review.comment, 80)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRelative(review.reviewDate)}
                  </p>
                </div>
                <Badge
                  variant={
                    review.responseStatus === 'PENDING'
                      ? 'warning'
                      : review.responseStatus === 'PUBLISHED'
                      ? 'success'
                      : 'default'
                  }
                >
                  {review.responseStatus === 'PENDING' ? 'Pendente' : 
                   review.responseStatus === 'PUBLISHED' ? 'Publicada' : 
                   review.responseStatus}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
