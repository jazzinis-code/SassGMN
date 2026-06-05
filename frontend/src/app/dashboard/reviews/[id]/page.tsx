'use client';

import React from 'react';
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
import { ArrowLeft, Sparkles, User, Calendar } from 'lucide-react';

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: review, isLoading } = useReview(id);
  const generateMutation = useGenerateResponse();
  const approveMutation = useApproveResponse();
  const rejectMutation = useRejectResponse();
  const publishMutation = usePublishResponse();

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Avaliacao nao encontrada</p>
      </div>
    );
  }

  const latestResponse =
    review.responses && review.responses.length > 0
      ? review.responses[review.responses.length - 1]
      : null;

  const handleGenerate = () => {
    generateMutation.mutate(review.id);
  };

  const handleApprove = () => {
    if (latestResponse) {
      approveMutation.mutate({ id: latestResponse.id });
    }
  };

  const handleReject = () => {
    if (latestResponse) {
      rejectMutation.mutate(latestResponse.id);
    }
  };

  const handlePublish = () => {
    if (latestResponse) {
      publishMutation.mutate(latestResponse.id);
    }
  };

  const handleSaveEdit = (text: string) => {
    if (latestResponse) {
      approveMutation.mutate({ id: latestResponse.id, publishedText: text });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Detalhes da avaliacao
          </h1>
        </div>
      </div>

      {/* Review Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Avaliacao</h3>
          <Badge
            variant={
              review.responseStatus === 'PENDING'
                ? 'warning'
                : review.responseStatus === 'PUBLISHED'
                ? 'success'
                : review.responseStatus === 'REJECTED'
                ? 'danger'
                : 'info'
            }
          >
            {review.responseStatus === 'PENDING' ? 'Pendente' :
             review.responseStatus === 'PUBLISHED' ? 'Publicada' :
             review.responseStatus === 'REJECTED' ? 'Rejeitada' :
             review.responseStatus === 'GENERATED' ? 'Gerada' :
             review.responseStatus === 'APPROVED' ? 'Aprovada' :
             review.responseStatus}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {review.reviewerName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={review.rating} size="sm" />
                <span className="text-xs text-gray-500">
                  {review.rating}/5
                </span>
              </div>
            </div>
          </div>

          {review.comment && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {review.comment}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(review.reviewDate)}
            </span>
            {review.business && (
              <span>{review.business.name}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Resposta</h3>
          {!latestResponse && (
            <Button
              size="sm"
              onClick={handleGenerate}
              isLoading={generateMutation.isPending}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Gerar resposta
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {latestResponse ? (
            <div className="space-y-4">
              <ResponseEditor
                initialText={latestResponse.publishedText || latestResponse.generatedText}
                onSave={handleSaveEdit}
                onRegenerate={handleGenerate}
                isRegenerating={generateMutation.isPending}
                isSaving={approveMutation.isPending}
              />

              {latestResponse.status === 'DRAFT' && (
                <div className="pt-4 border-t border-gray-100">
                  <ApprovalButtons
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onPublish={handlePublish}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                    isPublishing={publishMutation.isPending}
                    showPublish={false}
                  />
                </div>
              )}

              {latestResponse.status === 'APPROVED' && (
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    isLoading={publishMutation.isPending}
                  >
                    Publicar no Google
                  </Button>
                </div>
              )}

              {latestResponse.publishedAt && (
                <p className="text-xs text-gray-500">
                  Publicada em {formatDateTime(latestResponse.publishedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Nenhuma resposta gerada ainda. Clique em &quot;Gerar resposta&quot; para
                criar uma resposta com IA.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
