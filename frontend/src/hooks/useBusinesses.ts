'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Business, CreateBusinessDto, UpdateBusinessDto, PaginatedResponse } from '@/types';

export function useBusinesses(page = 1, limit = 10) {
  return useQuery<PaginatedResponse<Business>>({
    queryKey: ['businesses', page, limit],
    queryFn: async () => {
      const { data } = await api.get('/businesses', {
        params: { page, limit },
      });
      return data;
    },
  });
}

export function useBusiness(id: string) {
  return useQuery<Business>({
    queryKey: ['businesses', id],
    queryFn: async () => {
      const { data } = await api.get(`/businesses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateBusinessDto) => {
      const { data } = await api.post('/businesses', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateBusinessDto }) => {
      const { data } = await api.patch(`/businesses/${id}`, dto);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses', variables.id] });
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/businesses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}
