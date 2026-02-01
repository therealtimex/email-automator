/**
 * Role Selection Component
 *
 * Allows users to select their role and automatically installs appropriate rule packs
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle2, Sparkles } from 'lucide-react';

export type UserRole = 'executive' | 'developer' | 'sales' | 'operations' | 'marketing' | 'other';

interface RoleOption {
  value: UserRole;
  icon: string;
  label: string;
  description: string;
  packPreview: string[];
}

interface RoleSelectionProps {
  onRoleSelected: (role: UserRole) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function RoleSelection({ onRoleSelected, onSkip, isLoading = false }: RoleSelectionProps) {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const ROLE_OPTIONS: RoleOption[] = [
    {
      value: 'executive',
      icon: '👔',
      label: t('autopilot.role.executive.label'),
      description: t('autopilot.role.executive.desc'),
      packPreview: t('autopilot.role.executive.preview').split(';')
    },
    {
      value: 'sales',
      icon: '💼',
      label: t('autopilot.role.sales.label'),
      description: t('autopilot.role.sales.desc'),
      packPreview: t('autopilot.role.sales.preview').split(';')
    },
    {
      value: 'developer',
      icon: '💻',
      label: t('autopilot.role.developer.label'),
      description: t('autopilot.role.developer.desc'),
      packPreview: t('autopilot.role.developer.preview').split(';')
    },
    {
      value: 'operations',
      icon: '🛠️',
      label: t('autopilot.role.operations.label'),
      description: t('autopilot.role.operations.desc'),
      packPreview: t('autopilot.role.operations.preview').split(';')
    },
    {
      value: 'marketing',
      icon: '📊',
      label: t('autopilot.role.marketing.label'),
      description: t('autopilot.role.marketing.desc'),
      packPreview: t('autopilot.role.marketing.preview').split(';')
    },
    {
      value: 'other',
      icon: '⚙️',
      label: t('autopilot.role.other.label'),
      description: t('autopilot.role.other.desc'),
      packPreview: []
    }
  ];

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelected(selectedRole);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🎉 {t('autopilot.role.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('autopilot.role.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {ROLE_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-lg ${selectedRole === option.value
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              onClick={() => setSelectedRole(option.value)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{option.icon}</span>
                  <span>{option.label}</span>
                </CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              {option.packPreview.length > 0 && (
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">{t('autopilot.role.includes')}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.packPreview.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/50 text-[10px] font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center">
          {onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
            >
              {t('autopilot.role.skip')}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
            size="lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                {t('autopilot.role.settingUp')}
              </span>
            ) : (
              t('autopilot.role.continue')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
