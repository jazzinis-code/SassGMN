'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  showCount?: boolean;
  autoResize?: boolean;
}

export function Textarea({
  label,
  error,
  showCount = false,
  autoResize = false,
  className,
  id,
  maxLength,
  value,
  ...props
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const currentLength = typeof value === 'string' ? value.length : 0;

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        id={textareaId}
        value={value}
        maxLength={maxLength}
        className={cn(
          'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors resize-y',
          'placeholder:text-gray-400',
          'focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          autoResize && 'resize-none overflow-hidden',
          className
        )}
        {...props}
      />
      <div className="flex justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {showCount && maxLength && (
          <p className="text-xs text-gray-400 ml-auto">
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
