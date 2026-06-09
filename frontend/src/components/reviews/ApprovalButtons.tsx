'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Check, X } from 'lucide-react';

interface ApprovalButtonsProps {
  onApprove: () => void;
  onReject:  () => void;
  isApproving?: boolean;
  isRejecting?:  boolean;
}

export function ApprovalButtons({
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: ApprovalButtonsProps) {
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const handleConfirm = () => {
    if (confirmAction === 'approve') onApprove();
    if (confirmAction === 'reject')  onReject();
    setConfirmAction(null);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => setConfirmAction('approve')}
          isLoading={isApproving}
          disabled={isRejecting}
          leftIcon={<Check className="w-4 h-4" />}
        >
          Aprovar resposta
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setConfirmAction('reject')}
          isLoading={isRejecting}
          disabled={isApproving}
          leftIcon={<X className="w-4 h-4" />}
        >
          Rejeitar
        </Button>
      </div>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'approve' ? 'Aprovar resposta' : 'Rejeitar resposta'}
      >
        <p className="text-sm text-gray-600 mb-6">
          {confirmAction === 'approve'
            ? 'Confirma a aprovação desta resposta? Após aprovada, ela ficará pronta para publicação no Google.'
            : 'Confirma a rejeição? A resposta será descartada e você poderá regenerar uma nova.'}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirmAction === 'reject' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
          >
            {confirmAction === 'approve' ? 'Confirmar aprovação' : 'Confirmar rejeição'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
