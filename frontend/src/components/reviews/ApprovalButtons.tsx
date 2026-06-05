'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Check, X, Send } from 'lucide-react';

interface ApprovalButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  onPublish?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isPublishing?: boolean;
  showPublish?: boolean;
}

export function ApprovalButtons({
  onApprove,
  onReject,
  onPublish,
  isApproving = false,
  isRejecting = false,
  isPublishing = false,
  showPublish = false,
}: ApprovalButtonsProps) {
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'publish' | null>(null);

  const handleConfirm = () => {
    if (confirmAction === 'approve') onApprove();
    if (confirmAction === 'reject') onReject();
    if (confirmAction === 'publish' && onPublish) onPublish();
    setConfirmAction(null);
  };

  const confirmMessages = {
    approve: 'Tem certeza que deseja aprovar esta resposta?',
    reject: 'Tem certeza que deseja rejeitar esta resposta?',
    publish: 'Tem certeza que deseja publicar esta resposta no Google?',
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setConfirmAction('approve')}
          isLoading={isApproving}
          leftIcon={<Check className="w-4 h-4" />}
        >
          Aprovar
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setConfirmAction('reject')}
          isLoading={isRejecting}
          leftIcon={<X className="w-4 h-4" />}
        >
          Rejeitar
        </Button>
        {showPublish && onPublish && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('publish')}
            isLoading={isPublishing}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Publicar
          </Button>
        )}
      </div>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title="Confirmar acao"
      >
        <p className="text-sm text-gray-600 mb-4">
          {confirmAction && confirmMessages[confirmAction]}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction(null)}
          >
            Cancelar
          </Button>
          <Button
            variant={confirmAction === 'reject' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </div>
      </Modal>
    </>
  );
}
