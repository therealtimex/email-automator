import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { TerminalLogs } from '../TerminalLogs';
import { LogEntry } from '../types';

interface ProvisioningStepProps {
    logs: LogEntry[];
    error: string | null;
    onRetry: () => void;
}

export function ProvisioningStep({ logs, error, onRetry }: ProvisioningStepProps) {
    return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Provisioning</h3>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    Assembling infrastructure...
                </p>
            </div>

            <TerminalLogs logs={logs} />

            {error && (
                <Button
                    variant="destructive"
                    onClick={onRetry}
                    className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                >
                    Re-Initialize Engine
                </Button>
            )}
        </div>
    );
}
