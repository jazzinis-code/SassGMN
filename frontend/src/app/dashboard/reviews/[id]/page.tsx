'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReview } from '@/hooks/useReviews';
import {
  useGenerateResponse,
  useApproveResponse,
  useRejectResponse,
  usePublishResponse,
} from '@/hooks/useResponses';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ResponseEditor } from '@/components/reviews/ResponseEditor';
import { ApprovalButtons } from '@/components/reviews/ApprovalButtons';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Sparkles,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  Building2,
} from 'lucide-react';

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendente',
  GENERATED: 'Gerada',
  APPROVED:  'Aprovada',
  PUBLISHED: 'Publicada',
  REJECTED:  'Rejeitada',
};

const STATUS_VARIANTS: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDING:   'warning',
  GENERATED: 'info',
  APPROVED:  'info',
  PUBLISHED: 'success',
  REJECTED:  'danger',
};

const RESPONSE_STATUS_LABELS: Record<string, string> = {
  DRAFT:     'Rascunho',
  APPROVED:  'Aprovada',
  PUBLISHED: 'Publicada',
  REJECTED:  'Rejeitada',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const { data: review, isLoading } = useReview(id);

  const generateMutation = useGenerateResponse();
  const approveMutation  = useApproveResponse();
  const rejectMutation   = useRejectResponse();
  const publishMutation  = usePublishResponse();

  // Texto editado localmente — sincroniza quando a resposta carrega
  const [editedText, setEditedText] = useState<string | null>(null);
  const [actionError, setActionError]   = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Avaliação não encontrada</p>
      </div>
    );
  }

  // Última resposta (mais recente primeiro)
  const latestResponse = review.responses?.length
    ? review.responses[review.responses.length - 1]
    : null;

  // Texto atual no editor — prioriza edição local, senão usa a resposta do servidor
  const currentText =
    editedText ??
    latestResponse?.publishedText ??
    latestResponse?.generatedText ??
    '';

  // ─── Ações ──────────────────────────────────────────────────────────────────

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleGenerate = () => {
    clearFeedback();
    generateMutation.mutate(review.id, {
      onSuccess: () => {
        setEditedText(null); // reseta edição local para mostrar nova resposta
        setActionSuccess('Resposta gerada com sucesso!');
      },
      onError: (err: any) => {
        setActionError(
          err?.response?.data?.message ?? 'Erro ao gerar resposta. Tente novamente.',
        );
      },
    });
  };

  const handleApprove = () => {
    if (!latestResponse) return;
    clearFeedback();

    // Envia o texto editado (se houve edição) ou o texto original
    const textToSave = editedText?.trim() || latestResponse.generatedText;

    approveMutation.mutate(
      { id: latestResponse.id, publishedText: textToSave },
      {
        onSuccess: () => {
          setEditedText(null);
          setActionSuccess('Resposta aprovada! Agora você pode publicar no Google.');
        },
        onError: (err: any) => {
          setActionError(
            err?.response?.data?.message ?? 'Erro ao aprovar resposta.',
          );
        },
      },
    );
  };

  const handleReject = () => {
    if (!latestResponse) return;
    clearFeedback();
    rejectMutation.mutate(latestResponse.id, {
      onSuccess: () => {
        setEditedText(null);
        setActionSuccess('Resposta rejeitada. Você pode gerar uma nova resposta.');
      },
      onError: (err: any) => {
        setActionError(err?.response?.data?.message ?? 'Erro ao rejeitar resposta.');
      },
    });
  };

  const handlePublish = () => {
    if (!latestResponse) return;
    clearFeedback();
    publishMutation.mutate(latestResponse.id, {
      onSuccess: () => {
        setActionSuccess('Resposta publicada com sucesso no Google! ✓');
      },
      onError: (err: any) => {
        setActionError(
          err?.response?.data?.message ?? 'Erro ao publicar. Verifique o perfil Google vinculado.',
        );
      },
    });
  };

  const isAnyPending =
    generateMutation.isPending ||
    approveMutation.isPending  ||
    rejectMutation.isPending   ||
    publishMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes da avaliação</h1>
          {review.business && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              {review.business.name}
            </p>
          )}
        </div>
      </div>

      {/* Feedback global */}
      {actionSuccess && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 flex-1">{actionSuccess}</p>
          <button onClick={() => setActionSuccess(null)} className="text-green-500 hover:text-green-700 text-lg leading-none">×</button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Card da Avaliação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Avaliação</h3>
          <Badge variant={STATUS_VARIANTS[review.responseStatus] ?? 'warning'}>
            {STATUS_LABELS[review.responseStatus] ?? review.responseStatus}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{review.reviewerName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={review.rating} size="sm" />
                <span className="text-xs text-gray-500">{review.rating}/5</span>
              </div>
            </div>
          </div>

          {review.comment ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sem comentário — apenas nota.</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(review.reviewDate)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Card de Resposta */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">Resposta com IA</h3>
            {latestResponse && (
              <Badge variant={latestResponse.status === 'PUBLISHED' ? 'success' : latestResponse.status === 'REJECTED' ? 'danger' : 'info'}>
                {RESPONSE_STATUS_LABELS[latestResponse.status] ?? latestResponse.status}
              </Badge>
            )}
          </div>

          {/* Gerar / Regenerar */}
          <Button
            size="sm"
            variant={latestResponse ? 'ghost' : 'primary'}
            onClick={handleGenerate}
            isLoading={generateMutation.isPending}
            disabled={isAnyPending}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {latestResponse ? 'Regenerar' : 'Gerar resposta'}
          </Button>
        </CardHeader>

        <CardContent>
          {/* Estado vazio */}
          {!latestResponse && !generateMutation.isPending && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Sparkles className="w-10 h-10 text-gray-200" />
              <div>
                <p className="text-sm font-medium text-gray-700">Nenhuma resposta ainda</p>
                <p className="text-sm text-gray-400 mt-1">
                  Clique em <strong>Gerar resposta</strong> para criar uma resposta personalizada com IA.
                </p>
              </div>
            </div>
          )}

          {/* Gerando... */}
          {generateMutation.isPending && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Spinner size="md" />
              <p className="text-sm text-gray-500">Gerando resposta com IA...</p>
            </div>
          )}

          {/* Resposta disponível */}
          {latestResponse && !generateMutation.isPending && (
            <div className="space-y-5">

              {/* Editor */}
              <ResponseEditor
                key={latestResponse.id}
                initialText={currentText}
                onChange={setEditedText}
                readOnly={latestResponse.status === 'PUBLISHED'}
              />

              {/* Data de publicação */}
              {latestResponse.publishedAt && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  Publicada em {formatDateTime(latestResponse.publishedAt)}
                </p>
              )}

              {/* ─── Ações por status ──────────────────────────────────────── */}

              {/* DRAFT → Aprovar + Rejeitar */}
              {latestResponse.status === 'DRAFT' && (
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <p className="text-xs text-gray-500">
                    Edite o texto acima se necessário e depois aprove para publicar.
                  </p>
                  <ApprovalButtons
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                  />
                </div>
              )}

              {/* APPROVED → Publicar */}
              {latestResponse.status === 'APPROVED' && (
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <p className="text-xs text-gray-500">
                    Resposta aprovada. Pronta para ser publicada no Google.
                  </p>
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    isLoading={publishMutation.isPending}
                    disabled={isAnyPending}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Publicar no Google
                  </Button>
                </div>
              )}

              {/* REJECTED → pode regenerar */}
              {latestResponse.status === 'REJECTED' && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Resposta rejeitada. Clique em <strong>Regenerar</strong> para criar uma nova.
                  </p>
                </div>
              )}

              {/* PUBLISHED → só leitura */}
              {latestResponse.status === 'PUBLISHED' && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Esta resposta foi publicada no Google e não pode mais ser editada.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
