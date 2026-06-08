'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyPoint } from '@/hooks/useDashboard';

interface RatingTrendChartProps {
  data: DailyPoint[];
}

function formatDay(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function RatingTrendChart({ data }: RatingTrendChartProps) {
  const withRating = data.filter((d) => d.avgRating !== null);

  if (withRating.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
        Sem dados de avaliações no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={withRating} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          labelFormatter={(label) => formatDay(String(label))}
          formatter={(value: number) => [`${value} ★`, 'Nota média']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <ReferenceLine y={4} stroke="#e5e7eb" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="avgRating"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
