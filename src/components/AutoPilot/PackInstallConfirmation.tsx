/**
 * Pack Install Confirmation Component
 *
 * Shows user which rule packs were installed after role selection
 */

import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface InstalledPack {
  id: string;
  name: string;
  icon: string;
  ruleCount: number;
}

interface PackInstallConfirmationProps {
  role: string;
  installedPacks: InstalledPack[];
  onContinue: () => void;
}

export function PackInstallConfirmation({ role, installedPacks, onContinue }: PackInstallConfirmationProps) {
  const { t } = useLanguage();
  const totalRules = installedPacks.reduce((sum, pack) => sum + pack.ruleCount, 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('autopilot.onboarding.allSet')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('autopilot.onboarding.enabledDesc').replace('{count}', totalRules.toString())}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {installedPacks.map((pack) => (
            <Card key={pack.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{pack.icon}</span>
                  <span>{pack.name}</span>
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {pack.ruleCount} {t('autopilot.onboarding.rules')}
                  </span>
                </CardTitle>
                <CardDescription>
                  {pack.id === 'universal' && t('autopilot.onboarding.universalDesc')}
                  {pack.id === 'executive' && t('autopilot.onboarding.executiveDesc')}
                  {pack.id === 'developer' && t('autopilot.onboarding.developerDesc')}
                  {pack.id === 'sales' && t('autopilot.onboarding.salesDesc')}
                  {pack.id === 'operations' && t('autopilot.onboarding.operationsDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {t('autopilot.onboarding.tip')}
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={onContinue} size="lg">
            {t('autopilot.onboarding.start')}
          </Button>
        </div>
      </div>
    </div>
  );
}
