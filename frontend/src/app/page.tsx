'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  MessageSquare,
  Sparkles,
  Shield,
  Zap,
  BarChart3,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-600">ReviewAI</h1>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Gestao inteligente de{' '}
            <span className="text-brand-600">avaliacoes do Google</span>
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Responda avaliacoes do Google automaticamente com IA. Personalize o
            tom, aprove respostas e publique com um clique. Aumente sua
            reputacao online sem esforco.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={loginWithGoogle} className="px-8">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
              Entrar com Google
            </Button>
            {/* Link direto como fallback */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`}
              className="text-sm text-gray-400 hover:text-brand-600 underline underline-offset-2 transition-colors"
            >
              Ou clique aqui para entrar
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<Sparkles className="w-6 h-6 text-brand-600" />}
            title="Respostas com IA"
            description="Respostas personalizadas geradas por inteligencia artificial, seguindo o tom e estilo da sua marca"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-brand-600" />}
            title="Aprovacao manual"
            description="Revise e edite cada resposta antes de publicar, mantendo controle total sobre sua comunicacao"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-brand-600" />}
            title="Modo semi-automatico"
            description="Deixe a IA gerar as respostas e decida quais publicar com um simples clique de aprovacao"
          />
          <FeatureCard
            icon={<Building2 className="w-6 h-6 text-brand-600" />}
            title="Multi-empresas"
            description="Gerencie avaliacoes de multiplos perfis do Google em um unico painel centralizado"
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6 text-brand-600" />}
            title="Painel analitico"
            description="Acompanhe metricas de avaliacoes, tempo de resposta e evolucao da sua reputacao"
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6 text-brand-600" />}
            title="Historico completo"
            description="Acesse o historico de todas as respostas geradas, editadas e publicadas"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center w-12 h-12 bg-brand-50 rounded-lg mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
