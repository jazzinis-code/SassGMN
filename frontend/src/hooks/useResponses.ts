'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Response, PaginatedResponse } from '@/types';

export function useResponses(page = 1, limit = 10) {
  return useQuery<PaginatedResponse<Response>>({
    queryKey: ['responses', page, limit],
    queryFn: async () => {
      const { data } = await api.get('/responses', {
        params: { page, limit },
      });
      return data;
    },
  });
}

export function useGenerateResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await api.post(`/responses/generate/${reviewId}`);
      return data.data ?? data;
    },
    onSuccess: (_data, reviewId) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });
}

export function useApproveResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, publishedText }: { id: string; publishedText?: string }) => {
      const { data } = await api.patch(`/responses/${id}/approve`, { publishedText });
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });
}

export function useRejectResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/responses/${id}/reject`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
  });
}

export function usePublishResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/responses/${id}/publish`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
