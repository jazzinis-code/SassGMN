'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { AutomationToggle } from './AutomationToggle';
import type { Business, CreateBusinessDto, AutomationMode } from '@/types';

interface BusinessFormProps {
  business?: Business;
  onSubmit: (data: CreateBusinessDto) => void;
  isLoading?: boolean;
}

const segmentOptions = [
  { value: '', label: 'Selecione um segmento' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'clinica', label: 'Clinica' },
  { value: 'salao', label: 'Salao de Beleza' },
  { value: 'loja', label: 'Loja' },
  { value: 'servicos', label: 'Servicos' },
  { value: 'educacao', label: 'Educacao' },
  { value: 'saude', label: 'Saude' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'outro', label: 'Outro' },
];

export function BusinessForm({ business, onSubmit, isLoading }: BusinessFormProps) {
  const [formData, setFormData] = useState<CreateBusinessDto>({
    name: business?.name || '',
    segment: business?.segment || '',
    city: business?.city || '',
    googleProfileId: business?.googleProfileId || '',
    toneOfVoice: business?.toneOfVoice || '',
    keywords: business?.keywords || [],
    mainServices: business?.mainServices || [],
    whatsapp: business?.whatsapp || '',
    defaultResolutionMessage: business?.defaultResolutionMessage || '',
    avoidTerms: business?.avoidTerms || [],
    responseTemplate: business?.responseTemplate || '',
    automationMode: business?.automationMode || 'MANUAL',
  });

  const [keywordsInput, setKeywordsInput] = useState(
    (business?.keywords || []).join(', ')
  );
  const [servicesInput, setServicesInput] = useState(
    (business?.mainServices || []).join(', ')
  );
  const [avoidInput, setAvoidInput] = useState(
    (business?.avoidTerms || []).join(', ')
  );

  const handleChange = (
    field: keyof CreateBusinessDto,
    value: string | string[] | AutomationMode
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      keywords: keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      mainServices: servicesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      avoidTerms: avoidInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-gray-900">
            Informacoes basicas
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nome da empresa"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Ex: Restaurante Sabor & Arte"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Segmento"
              options={segmentOptions}
              value={formData.segment || ''}
              onChange={(e) => handleChange('segment', e.target.value)}
            />
            <Input
              label="Cidade"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Ex: Sao Paulo"
            />
          </div>
          <Input
            label="Google Profile ID"
            value={formData.googleProfileId || ''}
            onChange={(e) => handleChange('googleProfileId', e.target.value)}
            placeholder="ID do perfil no Google Business"
            helperText="Sera preenchido automaticamente ao conectar sua conta Google"
          />
          <Input
            label="WhatsApp"
            value={formData.whatsapp || ''}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
            placeholder="+55 (11) 99999-9999"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-gray-900">
            Personalizacao de respostas
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Tom de voz"
            value={formData.toneOfVoice || ''}
            onChange={(e) => handleChange('toneOfVoice', e.target.value)}
            placeholder="Ex: profissional, amigavel, descontraido"
          />
          <Input
            label="Palavras-chave (separadas por virgula)"
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="Ex: qualidade, atendimento, sabor"
            helperText="Palavras que a IA deve incluir nas respostas"
          />
          <Input
            label="Servicos principais (separados por virgula)"
            value={servicesInput}
            onChange={(e) => setServicesInput(e.target.value)}
            placeholder="Ex: delivery, dine-in, eventos"
          />
          <Input
            label="Termos a evitar (separados por virgula)"
            value={avoidInput}
            onChange={(e) => setAvoidInput(e.target.value)}
            placeholder="Ex: barato, desconto, concorrente"
            helperText="Palavras que a IA nunca deve usar"
          />
          <Textarea
            label="Mensagem padrao de resolucao"
            value={formData.defaultResolutionMessage || ''}
            onChange={(e) =>
              handleChange('defaultResolutionMessage', e.target.value)
            }
            rows={3}
            placeholder="Mensagem padrao para oferecer solucao em avaliacoes negativas"
          />
          <Textarea
            label="Template de resposta (opcional)"
            value={formData.responseTemplate || ''}
            onChange={(e) => handleChange('responseTemplate', e.target.value)}
            rows={4}
            placeholder="Template base para guiar a IA na geracao de respostas"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-gray-900">
            Modo de automacao
          </h3>
        </CardHeader>
        <CardContent>
          <AutomationToggle
            value={(formData.automationMode as AutomationMode) || 'MANUAL'}
            onChange={(mode) => handleChange('automationMode', mode)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" isLoading={isLoading}>
          {business ? 'Salvar alteracoes' : 'Criar empresa'}
        </Button>
      </div>
    </form>
  );
}
