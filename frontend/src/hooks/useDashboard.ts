'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      // O backend envolve a resposta em { data: {...}, statusCode, timestamp }
      return data.data ?? data;
    },
    staleTime: 2 * 60 * 1000, // 2 min — métricas não precisam de refresh constante
    retry: 1,
  });
}
