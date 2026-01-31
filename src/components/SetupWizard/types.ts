/**
 * Types for SetupWizard component
 */

export type WizardStep =
    | 'welcome'
    | 'type'
    | 'managed-token'
    | 'managed-org'
    | 'provisioning'
    | 'validating'
    | 'credentials'
    | 'migration';

export interface Organization {
    id: string;
    name: string;
}

export interface MigrationStatus {
    needsMigration: boolean;
    dbVersion: string | null;
    appVersion: string;
    isUnknown?: boolean;
}

export interface LogEntry {
    type: 'stdout' | 'stderr' | 'info' | 'error' | 'success';
    message: string;
    timestamp: number;
}

export interface SetupWizardProps {
    onComplete: () => void;
    open?: boolean;
    canClose?: boolean;
}

export interface ProvisioningResult {
    projectId: string;
    url: string;
    anonKey: string;
    dbPass: string;
}

export interface ValidationResult {
    valid: boolean;
    message?: string;
}

// State type for useReducer
export interface WizardState {
    // Current step
    step: WizardStep;

    // Managed flow state
    managed: {
        accessToken: string;
        organizations: Organization[];
        selectedOrg: string;
        projectName: string;
        region: string;
        isFetchingOrgs: boolean;
    };

    // Manual flow state
    manual: {
        url: string;
        anonKey: string;
    };

    // Shared state
    projectId: string;
    logs: LogEntry[];
    error: string | null;
    isMigrating: boolean;
    migrationStatus: MigrationStatus | null;
}

// Action types for reducer
export type WizardAction =
    | { type: 'SET_STEP'; payload: WizardStep }
    | { type: 'SET_ACCESS_TOKEN'; payload: string }
    | { type: 'SET_ORGANIZATIONS'; payload: Organization[] }
    | { type: 'SET_SELECTED_ORG'; payload: string }
    | { type: 'SET_PROJECT_NAME'; payload: string }
    | { type: 'SET_REGION'; payload: string }
    | { type: 'SET_FETCHING_ORGS'; payload: boolean }
    | { type: 'SET_MANUAL_URL'; payload: string }
    | { type: 'SET_MANUAL_ANON_KEY'; payload: string }
    | { type: 'SET_PROJECT_ID'; payload: string }
    | { type: 'ADD_LOG'; payload: Omit<LogEntry, 'timestamp'> }
    | { type: 'CLEAR_LOGS' }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_MIGRATING'; payload: boolean }
    | { type: 'SET_MIGRATION_STATUS'; payload: MigrationStatus | null }
    | { type: 'RESET_MANAGED_FLOW' }
    | { type: 'RESET_MANUAL_FLOW' };

// Server-sent event types
export interface SSEEvent {
    type: 'info' | 'error' | 'success' | 'project_id' | 'stdout' | 'stderr' | 'done';
    data: any;
}
