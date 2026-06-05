'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Hand, Zap, Bot } from 'lucide-react';
import { AutomationMode } from '@/types';

interface AutomationToggleProps {
  value: AutomationMode;
  onChange: (mode: AutomationMode) => void;
}

const modes: { value: AutomationMode; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: AutomationMode.MANUAL,
    label: 'Manual',
    description: 'Revisar e aprovar todas as respostas antes de publicar',
    icon: Hand,
  },
  {
    value: AutomationMode.SEMI_AUTO,
    label: 'Semi-automatico',
    description: 'Gerar respostas automaticamente, mas aguardar aprovacao para publicar',
    icon: Zap,
  },
  {
    value: AutomationMode.AUTO,
    label: 'Automatico',
    description: 'Gerar e publicar respostas automaticamente sem revisao',
    icon: Bot,
  },
];

export function AutomationToggle({ value, onChange }: AutomationToggleProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-center',
              isSelected
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Icon
              className={cn(
                'w-6 h-6 mb-2',
                isSelected ? 'text-brand-600' : 'text-gray-400'
              )}
            />
            <p
              className={cn(
                'text-sm font-medium mb-1',
                isSelected ? 'text-brand-700' : 'text-gray-700'
              )}
            >
              {mode.label}
            </p>
            <p className="text-xs text-gray-500">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
