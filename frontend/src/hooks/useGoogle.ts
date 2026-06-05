'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface GoogleBusinessProfile {
  name: string;       // "accounts/123/locations/456"
  title: string;      // nome do estabelecimento
  locationId: string; // "456"
}

/** Lista todos os perfis Google Business vinculados à conta do usuário */
export function useGoogleProfiles(enabled = true) {
  return useQuery<GoogleBusinessProfile[]>({
    queryKey: ['google', 'profiles'],
    queryFn: async () => {
      const { data } = await api.get('/google/profiles');
      return data.data ?? data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  });
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
      // Invalida o cache da empresa atualizada e a lista
      queryClient.invalidateQueries({ queryKey: ['businesses', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}
