import { AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { ConfirmDialogState } from '../hooks/useConfirm';

interface ConfirmDialogProps {
    state: ConfirmDialogState;
}

export function ConfirmDialog({ state }: ConfirmDialogProps) {
    return (
        <Dialog open={state.isOpen} onOpenChange={(open) => !open && state.onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {state.destructive && <AlertTriangle className="w-5 h-5 text-destructive" />}
                        {state.title}
                    </DialogTitle>
                    <DialogDescription>
                        {state.description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={state.onCancel}>
                        {state.cancelText}
                    </Button>
                    <Button
                        variant={state.destructive ? "destructive" : "default"}
                        onClick={state.onConfirm}
                    >
                        {state.confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
