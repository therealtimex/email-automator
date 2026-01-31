/**
 * Role Selection Component
 *
 * Allows users to select their role and automatically installs appropriate rule packs
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export type UserRole = 'executive' | 'developer' | 'sales' | 'operations' | 'marketing' | 'other';

interface RoleOption {
  value: UserRole;
  icon: string;
  label: string;
  description: string;
  packPreview: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'executive',
    icon: '👔',
    label: 'Executive / Leadership',
    description: 'Focus on VIPs, contracts, and strategic communications',
    packPreview: ['VIP Client Prioritizer', 'Travel Organizer', 'Legal & Contracts']
  },
  {
    value: 'sales',
    icon: '💼',
    label: 'Sales / Business Development',
    description: 'Prioritize leads and customer communications',
    packPreview: ['Customer Questions', 'CRM Organizer', 'Proposal Tracker']
  },
  {
    value: 'developer',
    icon: '💻',
    label: 'Developer / Engineer',
    description: 'Surface critical alerts and filter tool noise',
    packPreview: ['System Alerts', 'Code Reviews', 'Project Management']
  },
  {
    value: 'operations',
    icon: '🛠️',
    label: 'Operations / Support',
    description: 'Organize tickets and internal communications',
    packPreview: ['Support Tickets', 'System Monitoring', 'Internal Comms']
  },
  {
    value: 'marketing',
    icon: '📊',
    label: 'Marketing',
    description: 'Track campaigns and customer engagement',
    packPreview: ['Campaign Tracking', 'Analytics Reports', 'Social Media']
  },
  {
    value: 'other',
    icon: '⚙️',
    label: 'Other / Manual Setup',
    description: 'I\'ll configure my own automation rules',
    packPreview: []
  }
];

interface RoleSelectionProps {
  onRoleSelected: (role: UserRole) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function RoleSelection({ onRoleSelected, onSkip, isLoading = false }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelected(selectedRole);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🎉 One Last Step!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            What best describes your role? We'll set up the right automation rules for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {ROLE_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedRole === option.value
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
                    <p className="font-medium mb-1">Includes:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {option.packPreview.map((rule, idx) => (
                        <li key={idx}>{rule}</li>
                      ))}
                    </ul>
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
              Skip for now
            </Button>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
            size="lg"
          >
            {isLoading ? 'Setting up...' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
