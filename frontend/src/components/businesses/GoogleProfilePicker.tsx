'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useGoogleProfiles, useConnectGoogleProfile } from '@/hooks/useGoogle';
import { cn } from '@/lib/utils';
import { MapPin, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { Business } from '@/types';

interface GoogleProfilePickerProps {
  business: Business;
}

/**
 * Botão + modal para vincular um perfil Google Business a uma empresa.
 *
 * Fluxo:
 *  1. Usuário clica em "Vincular perfil Google"
 *  2. Modal abre e lista todos os perfis Google Business da conta
 *  3. Usuário clica no perfil desejado
 *  4. Chamada POST /businesses/:id/connect-google → atualiza businesss
 *  5. Modal fecha e badge de status é atualizado
 */
export function GoogleProfilePicker({ business }: GoogleProfilePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: profiles, isLoading, isError, refetch } = useGoogleProfiles(open);
  const connectMutation = useConnectGoogleProfile();

  const isConnected = Boolean(business.googleProfileId);

  const handleSelect = (profileName: string) => {
    setSelectedId(profileName);
  };

  const handleConfirm = () => {
    if (!selectedId) return;

    connectMutation.mutate(
      { businessId: business.id, googleProfileId: selectedId },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedId(null);
        },
      },
    );
  };

  const handleClose = () => {
    if (connectMutation.isPending) return;
    setOpen(false);
    setSelectedId(null);
  };

  return (
    <>
      {/* Botão de trigger com status atual */}
      <div className="flex items-center gap-3">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 font-mono truncate max-w-xs">
              {business.googleProfileId}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Alterar
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<MapPin className="w-4 h-4" />}
            onClick={() => setOpen(true)}
          >
            Vincular perfil Google
          </Button>
        )}
      </div>

      {/* Modal de seleção */}
      <Modal
        isOpen={open}
        onClose={handleClose}
        title="Vincular perfil Google Business"
        className="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Selecione o perfil do Google Business Profile que corresponde à empresa{' '}
            <strong>{business.name}</strong>.
          </p>

          {/* Estado de carregamento */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          )}

          {/* Erro ao buscar perfis */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-gray-500">
                Não foi possível carregar os perfis Google.
                <br />
                Verifique se sua conta tem permissão para acessar o Google Business Profile.
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Lista de perfis */}
          {!isLoading && !isError && profiles && (
            <>
              {profiles.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <MapPin className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    Nenhum perfil Google Business encontrado na sua conta.
                  </p>
                  <p className="text-xs text-gray-400">
                    Acesse{' '}
                    <a
                      href="https://business.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      business.google.com
                    </a>{' '}
                    para criar ou reivindicar um perfil.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {profiles.map((profile) => {
                    const isCurrentlyLinked = business.googleProfileId === profile.name;
                    const isSelected = selectedId === profile.name;

                    return (
                      <button
                        key={profile.name}
                        type="button"
                        onClick={() => handleSelect(profile.name)}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                          isSelected
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <MapPin
                            className={cn(
                              'w-5 h-5',
                              isSelected ? 'text-brand-600' : 'text-gray-400',
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={cn(
                                'text-sm font-medium',
                                isSelected ? 'text-brand-700' : 'text-gray-800',
                              )}
                            >
                              {profile.title}
                            </p>
                            {isCurrentlyLinked && (
                              <Badge variant="success">Vinculado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                            {profile.name}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Ações */}
              {profiles.length > 0 && (
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleClose}
                    disabled={connectMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={!selectedId || selectedId === business.googleProfileId}
                    isLoading={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? 'Vinculando...' : 'Confirmar vínculo'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
