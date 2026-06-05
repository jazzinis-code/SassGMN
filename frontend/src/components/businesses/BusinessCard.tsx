'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Building2, MapPin, Tag } from 'lucide-react';
import type { Business, AutomationMode } from '@/types';

interface BusinessCardProps {
  business: Business;
}

function getAutomationLabel(mode: AutomationMode): string {
  const labels: Record<string, string> = {
    MANUAL: 'Manual',
    SEMI_AUTO: 'Semi-automatico',
    AUTO: 'Automatico',
  };
  return labels[mode] || mode;
}

function getAutomationBadgeVariant(
  mode: AutomationMode
): 'success' | 'warning' | 'info' {
  const variants: Record<string, 'success' | 'warning' | 'info'> = {
    MANUAL: 'warning',
    SEMI_AUTO: 'info',
    AUTO: 'success',
  };
  return variants[mode] || 'info';
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link href={`/dashboard/businesses/${business.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="py-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-brand-50 rounded-lg">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {business.name}
                </h3>
                {business.segment && (
                  <p className="text-xs text-gray-500">{business.segment}</p>
                )}
              </div>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${business.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {business.city && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                {business.city}
              </span>
            )}
            {business.mainServices.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Tag className="w-3 h-3" />
                {business.mainServices.length} servicos
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <Badge variant={getAutomationBadgeVariant(business.automationMode)}>
              {getAutomationLabel(business.automationMode)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
