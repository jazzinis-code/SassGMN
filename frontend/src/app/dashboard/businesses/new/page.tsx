'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBusiness } from '@/hooks/useBusinesses';
import { BusinessForm } from '@/components/businesses/BusinessForm';
import { ArrowLeft } from 'lucide-react';
import type { CreateBusinessDto } from '@/types';

export default function NewBusinessPage() {
  const router = useRouter();
  const createMutation = useCreateBusiness();

  const handleSubmit = (data: CreateBusinessDto) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        router.push('/dashboard/businesses');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova empresa</h1>
          <p className="text-sm text-gray-500">
            Cadastre uma nova empresa para gerenciar avaliacoes
          </p>
        </div>
      </div>

      <BusinessForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
    </div>
  );
}
