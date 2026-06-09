'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import {
  useGoogleProfiles,
  useConnectGoogleProfile,
  getGoogleProfilesErrorType,
} from '@/hooks/useGoogle';
import { cn } from '@/lib/utils';
import { MapPin, CheckCircle2, AlertCircle, RefreshCw, LogIn, ShieldAlert } from 'lucide-react';
import type { Business } from '@/types';

interface GoogleProfilePickerProps {
  business: Business;
}

/** Botão de retry com cooldown para evitar estourar quota da API */
function RetryButton({ onRetry, cooldownSeconds = 15 }: { onRetry: () => void; cooldownSeconds?: number }) {
  const [cooldown, setCooldown] = useState(0);

  const handleClick = useCallback(() => {
    onRetry();
    setCooldown(cooldownSeconds);
  }, [onRetry, cooldownSeconds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <Button
      variant="secondary"
      size="sm"
      leftIcon={<RefreshCw className="w-4 h-4" />}
      onClick={handleClick}
      disabled={cooldown > 0}
    >
      {cooldown > 0 ? `Aguarde ${cooldown}s...` : 'Tentar novamente'}
    </Button>
  );
}

/** Mensagens e ações por tipo de erro */
function ErrorState({
  error,
  onRetry,
}: {
  error: any;
  onRetry: () => void;
}) {
  const type = getGoogleProfilesErrorType(error);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  if (type === 'QUOTA_EXCEEDED') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <div>
          <p className="text-sm font-medium text-gray-800">Limite de requisições atingido</p>
          <p className="text-sm text-gray-500 mt-1">
            A API do Google atingiu o limite por minuto. Aguarde 1 minuto e tente novamente.
          </p>
        </div>
        <RetryButton onRetry={onRetry} cooldownSeconds={60} />
      </div>
    );
  }

  if (type === 'EXPIRED_NO_REFRESH' || type === 'UNAUTHORIZED') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <LogIn className="w-8 h-8 text-amber-400" />
        <div>
          <p className="text-sm font-medium text-gray-800">Sessão do Google expirada</p>
          <p className="text-sm text-gray-500 mt-1">
            Você precisa fazer login novamente para autorizar o acesso ao Google Business Profile.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { window.location.href = `${apiUrl}/auth/google`; }}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Fazer login com Google
        </Button>
      </div>
    );
  }

  if (type === 'PERMISSION_DENIED') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <ShieldAlert className="w-8 h-8 text-red-400" />
        <div>
          <p className="text-sm font-medium text-gray-800">Permissão negada</p>
          <p className="text-sm text-gray-500 mt-1">
            A API do Google Business Profile não está habilitada ou sua conta não tem acesso.
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-left space-y-1 w-full">
          <p className="font-medium text-gray-600">Como resolver:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Acesse o{' '}
              <a
                href="https://console.cloud.google.com/apis/library/mybusiness.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>Habilite a <strong>My Business API</strong> e a <strong>Business Profile API</strong></li>
            <li>
              Verifique se a conta tem acesso em{' '}
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                business.google.com
              </a>
            </li>
            <li>Faça login novamente após habilitar</li>
          </ol>
        </div>
        <RetryButton onRetry={onRetry} />
      </div>
    );
  }

  // Erro genérico
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <div>
        <p className="text-sm font-medium text-gray-800">Não foi possível carregar os perfis</p>
        <p className="text-sm text-gray-500 mt-1">
          {error?.response?.data?.message ?? 'Ocorreu um erro inesperado. Tente novamente.'}
        </p>
      </div>
      <RetryButton onRetry={onRetry} />
    </div>
  );
}

/**
 * Botão + modal para vincular um perfil Google Business a uma empresa.
 *
 * Fluxo:
 *  1. Usuário clica em "Vincular perfil Google"
 *  2. Modal abre e lista todos os perfis Google Business da conta
 *  3. Usuário clica no perfil desejado
 *  4. Chamada POST /businesses/:id/connect-google → atualiza business
 *  5. Modal fecha e badge de status é atualizado
 */
export function GoogleProfilePicker({ business }: GoogleProfilePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: profiles, isLoading, isError, error, refetch } = useGoogleProfiles(open);
  const connectMutation = useConnectGoogleProfile();

  const isConnected = Boolean(business.googleProfileId);

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
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
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
            <div className="flex flex-col items-center gap-2 py-8">
              <Spinner size="md" />
              <p className="text-xs text-gray-400">Carregando perfis Google...</p>
            </div>
          )}

          {/* Erro tipado */}
          {isError && !isLoading && (
            <ErrorState error={error} onRetry={() => refetch()} />
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
                        onClick={() => setSelectedId(profile.name)}
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
