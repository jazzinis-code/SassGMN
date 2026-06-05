'use client';

import React from 'react';
import Link from 'next/link';
import { useBusinesses } from '@/hooks/useBusinesses';
import { BusinessCard } from '@/components/businesses/BusinessCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Table';
import { Plus, Building2 } from 'lucide-react';

export default function BusinessesPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useBusinesses(page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie seus perfis de negocio e configuracoes de resposta
          </p>
        </div>
        <Link href="/dashboard/businesses/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Nova empresa</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12">
          <Spinner size="lg" />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-gray-400" />}
          title="Nenhuma empresa cadastrada"
          description="Adicione sua primeira empresa para comecar a gerenciar avaliacoes e respostas automatizadas."
          actionLabel="Adicionar empresa"
          onAction={() => {}}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
          {data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
