'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { truncateText, formatRelative } from '@/lib/utils';
import type { Review, ReviewResponseStatus } from '@/types';

interface ReviewCardProps {
  review: Review;
}

function getStatusBadgeVariant(
  status: ReviewResponseStatus
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    PENDING: 'warning',
    GENERATED: 'info',
    APPROVED: 'success',
    PUBLISHED: 'success',
    REJECTED: 'danger',
  };
  return map[status] || 'default';
}

function getStatusLabel(status: ReviewResponseStatus): string {
  const map: Record<string, string> = {
    PENDING: 'Pendente',
    GENERATED: 'Gerada',
    APPROVED: 'Aprovada',
    PUBLISHED: 'Publicada',
    REJECTED: 'Rejeitada',
  };
  return map[status] || status;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Link href={`/dashboard/reviews/${review.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900">
                  {review.reviewerName}
                </p>
                <StarRating rating={review.rating} size="sm" />
              </div>
              {review.comment && (
                <p className="text-sm text-gray-600 mb-2">
                  {truncateText(review.comment, 120)}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {review.business && <span>{review.business.name}</span>}
                <span>{formatRelative(review.reviewDate)}</span>
              </div>
            </div>
            <Badge variant={getStatusBadgeVariant(review.responseStatus)}>
              {getStatusLabel(review.responseStatus)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
