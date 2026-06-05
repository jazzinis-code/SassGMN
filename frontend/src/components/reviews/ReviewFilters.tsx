'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RotateCcw } from 'lucide-react';
import type { Business, FilterReviewsDto, ReviewResponseStatus } from '@/types';

interface ReviewFiltersProps {
  filters: FilterReviewsDto;
  onFiltersChange: (filters: FilterReviewsDto) => void;
  businesses: Business[];
}

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'GENERATED', label: 'Gerada' },
  { value: 'APPROVED', label: 'Aprovada' },
  { value: 'PUBLISHED', label: 'Publicada' },
  { value: 'REJECTED', label: 'Rejeitada' },
];

const ratingOptions = [
  { value: '', label: 'Todas as notas' },
  { value: '1', label: '1 estrela' },
  { value: '2', label: '2 estrelas' },
  { value: '3', label: '3 estrelas' },
  { value: '4', label: '4 estrelas' },
  { value: '5', label: '5 estrelas' },
];

export function ReviewFilters({
  filters,
  onFiltersChange,
  businesses,
}: ReviewFiltersProps) {
  const businessOptions = [
    { value: '', label: 'Todas as empresas' },
    ...businesses.map((b) => ({ value: b.id, label: b.name })),
  ];

  const handleChange = (key: keyof FilterReviewsDto, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else if (key === 'rating') {
      newFilters[key] = parseInt(value, 10);
    } else if (key === 'status') {
      newFilters[key] = value as ReviewResponseStatus;
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="w-48">
        <Select
          label="Empresa"
          options={businessOptions}
          value={filters.businessId || ''}
          onChange={(e) => handleChange('businessId', e.target.value)}
        />
      </div>
      <div className="w-40">
        <Select
          label="Nota"
          options={ratingOptions}
          value={filters.rating?.toString() || ''}
          onChange={(e) => handleChange('rating', e.target.value)}
        />
      </div>
      <div className="w-44">
        <Select
          label="Status"
          options={statusOptions}
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
        />
      </div>
      <div className="w-40">
        <Input
          label="Data inicio"
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => handleChange('startDate', e.target.value)}
        />
      </div>
      <div className="w-40">
        <Input
          label="Data fim"
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => handleChange('endDate', e.target.value)}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        leftIcon={<RotateCcw className="w-4 h-4" />}
      >
        Limpar
      </Button>
    </div>
  );
}
