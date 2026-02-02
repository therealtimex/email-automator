/**
 * Auto-Pilot Badge Component
 *
 * Displays a badge indicating system-managed automation rules
 * with optimized dark/light mode contrast
 */

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function AutoPilotBadge() {
  const { t } = useLanguage();

  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700 shrink-0 font-medium">
      {t('autopilot.badge')}
    </span>
  );
}
