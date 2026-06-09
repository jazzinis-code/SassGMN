'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data.data ?? data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

export interface DailyPoint {
  date: string;
  reviews: number;
  responses: number;
  avgRating: number | null;
}

export interface StatusBreakdown {
  status: string;
  label: string;
  count: number;
}

export interface ChartData {
  dailyReviews: DailyPoint[];
  responseStatusBreakdown: StatusBreakdown[];
}

export function useDashboardCharts(days = 30) {
  return useQuery<ChartData>({
    queryKey: ['dashboard', 'charts', days],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/chart-data', { params: { days } });
      return data.data ?? data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
