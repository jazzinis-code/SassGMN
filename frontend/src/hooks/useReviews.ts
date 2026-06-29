'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Review, FilterReviewsDto, PaginatedResponse } from '@/types';

export function useReviews(filters: FilterReviewsDto = {}) {
  return useQuery<PaginatedResponse<Review>>({
    queryKey: ['reviews', filters],
    queryFn: async () => {
      const { data } = await api.get('/reviews', { params: filters });
      // Backend envolve toda resposta em { data, statusCode, timestamp }
      // PaginatedResponse fica em data.data
      return data.data ?? data;
    },
  });
}

export function useReview(id: string) {
  return useQuery<Review>({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const { data } = await api.get(`/reviews/${id}`);
      return data.data ?? data;
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
    },
  });
}
