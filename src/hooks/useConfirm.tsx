import { useState, useCallback } from 'react';

export interface ConfirmOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
}

export interface ConfirmDialogState extends ConfirmOptions {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Hook for managing confirmation dialogs
 * Returns [confirm function, dialog state]
 */
export function useConfirm() {
    const [dialogState, setDialogState] = useState<ConfirmDialogState>({
        isOpen: false,
        title: '',
        description: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        destructive: false,
        onConfirm: () => {},
        onCancel: () => {}
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                ...options,
                isOpen: true,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                onConfirm: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    }, []);

    return { confirm, dialogState };
}
