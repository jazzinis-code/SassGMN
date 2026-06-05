'use client';

import React, { useState } from 'react';
import { useResponses } from '@/hooks/useResponses';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, truncateText } from '@/lib/utils';
import { History } from 'lucide-react';
import Link from 'next/link';
import type { ResponseStatus } from '@/types';

function getStatusBadge(status: ResponseStatus) {
  const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    DRAFT: { variant: 'default', label: 'Rascunho' },
    APPROVED: { variant: 'info', label: 'Aprovada' },
    PUBLISHED: { variant: 'success', label: 'Publicada' },
    REJECTED: { variant: 'danger', label: 'Rejeitada' },
  };
  const { variant, label } = config[status] || config.DRAFT;
  return <Badge variant={variant}>{label}</Badge>;
}

export default function ResponsesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useResponses(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Historico de respostas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Acompanhe todas as respostas geradas, aprovadas e publicadas
        </p>
      </div>

      {isLoading ? (
        <div className="py-12">
          <Spinner size="lg" />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8 text-gray-400" />}
          title="Nenhuma resposta encontrada"
          description="Quando voce gerar respostas para avaliacoes, elas aparecerao aqui."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Empresa</TableCell>
                <TableCell isHeader>Avaliador</TableCell>
                <TableCell isHeader>Nota</TableCell>
                <TableCell isHeader>Resposta</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader>Data</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((response) => (
                <TableRow key={response.id}>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {response.review?.business?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/reviews/${response.reviewId}`}
                      className="text-sm text-brand-600 hover:text-brand-700"
                    >
                      {response.review?.reviewerName || '-'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {response.review && (
                      <StarRating rating={response.review.rating} size="sm" />
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600 max-w-xs">
                      {truncateText(
                        response.publishedText || response.generatedText,
                        60
                      )}
                    </p>
                  </TableCell>
                  <TableCell>{getStatusBadge(response.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {formatDate(response.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
