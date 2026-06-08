'use client';

import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/Textarea';

interface ResponseEditorProps {
  /** Texto inicial que popula o editor (ex: generatedText ou publishedText) */
  initialText: string;
  /** Chamado sempre que o texto muda — permite o pai rastrear edições locais */
  onChange?: (text: string) => void;
  /** Quando true, o campo é somente leitura (ex: status PUBLISHED) */
  readOnly?: boolean;
}

export function ResponseEditor({
  initialText,
  onChange,
  readOnly = false,
}: ResponseEditorProps) {
  const [text, setText] = useState(initialText);

  // Sincroniza quando a prop muda (ex: após regenerar)
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    onChange?.(val);
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {readOnly ? 'Resposta publicada' : 'Resposta gerada'}
      </label>
      <Textarea
        value={text}
        onChange={handleChange}
        readOnly={readOnly}
        rows={6}
        autoResize
        showCount={!readOnly}
        maxLength={2000}
        placeholder="A resposta gerada pela IA aparecerá aqui..."
        className={readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}
      />
      {!readOnly && (
        <p className="text-xs text-gray-400">
          Edite o texto acima se necessário antes de aprovar.
        </p>
      )}
    </div>
  );
}
