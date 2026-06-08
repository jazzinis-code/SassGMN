'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { User, Shield, Bell, Trash2, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading, refetchUser } = useAuth();

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Preenche o campo quando o user carregar
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!name.trim() || name === user?.name) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      await userService.updateMe({ name: name.trim() });
      await refetchUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie seu perfil e preferências da plataforma
        </p>
      </div>

      {/* Perfil */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-brand-50 rounded-lg">
            <User className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Perfil</h3>
            <p className="text-sm text-gray-500">Informações da sua conta</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Input
              label="Nome"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveSuccess(false);
                setSaveError('');
              }}
              placeholder="Seu nome"
            />
          </div>

          <Input
            label="Email"
            value={user?.email || ''}
            readOnly
            helperText="O email é obtido da conta Google e não pode ser alterado"
          />

          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveName}
              disabled={isSaving || !name.trim() || name === user?.name}
              size="sm"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar nome'
              )}
            </Button>

            {saveSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="w-4 h-4" />
                Nome atualizado!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contas conectadas */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Contas conectadas
            </h3>
            <p className="text-sm text-gray-500">Contas de serviço vinculadas</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Google Account</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Badge variant="success">Conectada</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Notificações</h3>
            <p className="text-sm text-gray-500">Preferências de notificação</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              label: 'Novas avaliações',
              desc: 'Receber notificação quando uma nova avaliação for detectada',
            },
            {
              label: 'Respostas publicadas',
              desc: 'Receber confirmação quando uma resposta for publicada',
            },
            {
              label: 'Avaliações negativas',
              desc: 'Alerta imediato para avaliações com 1 ou 2 estrelas',
            },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Zona de perigo */}
      <Card className="border-red-200">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-900">Zona de perigo</h3>
            <p className="text-sm text-gray-500">Ações irreversíveis</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-red-900">Excluir conta</p>
              <p className="text-xs text-red-700">
                Remove permanentemente todos os seus dados e configurações
              </p>
            </div>
            <Button variant="danger" size="sm">
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
