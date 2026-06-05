'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusiness, useUpdateBusiness, useDeleteBusiness } from '@/hooks/useBusinesses';
import { BusinessForm } from '@/components/businesses/BusinessForm';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { CreateBusinessDto } from '@/types';

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: business, isLoading } = useBusiness(id);
  const updateMutation = useUpdateBusiness();
  const deleteMutation = useDeleteBusiness();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const handleSubmit = (data: CreateBusinessDto) => {
    updateMutation.mutate(
      { id, dto: data },
      {
        onSuccess: () => {
          router.push('/dashboard/businesses');
        },
      }
    );
  };

  const handleToggleActive = (isActive: boolean) => {
    updateMutation.mutate({ id, dto: { isActive } });
  };

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        router.push('/dashboard/businesses');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Empresa nao encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {business.name}
            </h1>
            <p className="text-sm text-gray-500">Editar informacoes da empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle
            enabled={business.isActive}
            onChange={handleToggleActive}
            label="Ativa"
          />
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Excluir
          </Button>
        </div>
      </div>

      <BusinessForm
        business={business}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir empresa"
      >
        <p className="text-sm text-gray-600 mb-4">
          Tem certeza que deseja excluir &quot;{business.name}&quot;? Esta acao
          nao pode ser desfeita e todos os dados associados serao perdidos.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            Excluir permanentemente
          </Button>
        </div>
      </Modal>
    </div>
  );
}
