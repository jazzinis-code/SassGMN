'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyPoint } from '@/hooks/useDashboard';

interface ReviewsBarChartProps {
  data: DailyPoint[];
}

function formatDay(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function ReviewsBarChart({ data }: ReviewsBarChartProps) {
  // Filtra dias com alguma atividade para não poluir o eixo X
  const filtered = data.filter((d) => d.reviews > 0 || d.responses > 0);
  const chartData = filtered.length > 0 ? filtered : data.slice(-14);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          labelFormatter={(label) => formatDay(String(label))}
          formatter={(value: number, name: string) => [
            value,
            name === 'reviews' ? 'Avaliações' : 'Publicadas',
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          formatter={(value) => (value === 'reviews' ? 'Avaliações recebidas' : 'Respostas publicadas')}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="reviews"   fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="responses" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
