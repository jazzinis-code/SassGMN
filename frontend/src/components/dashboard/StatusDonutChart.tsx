'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StatusBreakdown } from '@/hooks/useDashboard';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   '#f59e0b',
  GENERATED: '#6366f1',
  APPROVED:  '#3b82f6',
  PUBLISHED: '#22c55e',
  REJECTED:  '#ef4444',
};

interface StatusDonutChartProps {
  data: StatusBreakdown[];
}

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const hasData = total > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
        Nenhuma avaliação ainda
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] ?? '#9ca3af'}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value} (${Math.round((value / total) * 100)}%)`,
            name,
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
