'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface GoogleBusinessProfile {
  name: string;       // "accounts/123/locations/456"
  title: string;      // nome do estabelecimento
  locationId: string; // "456"
}

export interface GoogleTokenStatus {
  hasToken: boolean;
  hasRefreshToken: boolean;
  isExpired: boolean;
  expiresAt?: string;
}

export type GoogleProfilesError =
  | 'NO_TOKEN'          // Usuário não tem token Google salvo
  | 'EXPIRED_NO_REFRESH' // Token expirado e sem refresh_token
  | 'PERMISSION_DENIED' // API não habilitada ou sem acesso (403)
  | 'UNAUTHORIZED'      // Token inválido (401)
  | 'UNKNOWN';

function parseGoogleError(error: any): GoogleProfilesError {
  const status = error?.response?.status;
  const type = error?.response?.data?.type;
  const message: string = error?.response?.data?.message ?? error?.message ?? '';

  if (status === 401 || message.includes('login novamente') || message.includes('não encontrado')) {
    if (message.includes('refresh')) return 'EXPIRED_NO_REFRESH';
    return 'UNAUTHORIZED';
  }
  if (status === 403 || type === 'GOOGLE_API_ERROR') return 'PERMISSION_DENIED';

  return 'UNKNOWN';
}

/** Verifica status do token Google antes de buscar os perfis */
export function useGoogleTokenStatus() {
  return useQuery<GoogleTokenStatus>({
    queryKey: ['google', 'token-status'],
    queryFn: async () => {
      const { data } = await api.get('/google/token-status');
      return data.data ?? data;
    },
    staleTime: 30 * 1000,
  });
}

/** Lista todos os perfis Google Business vinculados à conta do usuário */
export function useGoogleProfiles(enabled = true) {
  return useQuery<GoogleBusinessProfile[], { googleError?: GoogleProfilesError; message?: string }>({
    queryKey: ['google', 'profiles'],
    queryFn: async () => {
      const { data } = await api.get('/google/profiles');
      return data.data ?? data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    // Espera 15s antes de tentar novamente (evita estourar quota)
    retryDelay: 15_000,
    retry: 1,
  });
}

/** Retorna o tipo de erro tipado a partir do erro da query */
export function getGoogleProfilesErrorType(error: any): GoogleProfilesError {
  return parseGoogleError(error);
}

/** Vincula um perfil Google a uma empresa via POST /businesses/:id/connect-google */
export function useConnectGoogleProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      googleProfileId,
    }: {
      businessId: string;
      googleProfileId: string;
    }) => {
      const { data } = await api.post(`/businesses/${businessId}/connect-google`, {
        googleProfileId,
      });
      return data.data ?? data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businesses', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}
