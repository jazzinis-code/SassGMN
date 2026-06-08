'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Review, FilterReviewsDto, PaginatedResponse } from '@/types';

export function useReviews(filters: FilterReviewsDto = {}) {
  return useQuery<PaginatedResponse<Review>>({
    queryKey: ['reviews', filters],
    queryFn: async () => {
      const { data } = await api.get('/reviews', { params: filters });
      return data;
    },
  });
}

export function useReview(id: string) {
  return useQuery<Review>({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const { data } = await api.get(`/reviews/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSyncReviews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const { data } = await api.post(`/reviews/sync/${businessId}`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
