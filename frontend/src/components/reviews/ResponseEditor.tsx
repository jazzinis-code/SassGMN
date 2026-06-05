'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';

interface ResponseEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  isSaving?: boolean;
}

export function ResponseEditor({
  initialText,
  onSave,
  onRegenerate,
  isRegenerating = false,
  isSaving = false,
}: ResponseEditorProps) {
  const [text, setText] = useState(initialText);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Resposta gerada
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          isLoading={isRegenerating}
          leftIcon={<Sparkles className="w-4 h-4" />}
        >
          Regenerar
        </Button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        autoResize
        showCount
        maxLength={2000}
        placeholder="A resposta gerada pela IA aparecera aqui..."
      />
      <div className="flex justify-end">
        <Button
          onClick={() => onSave(text)}
          isLoading={isSaving}
          disabled={!text.trim()}
          size="sm"
        >
          Salvar alteracoes
        </Button>
      </div>
    </div>
  );
}
