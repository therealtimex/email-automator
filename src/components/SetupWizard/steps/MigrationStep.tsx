import { motion } from 'framer-motion';
import { AlertCircle, Boxes, Key, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { TerminalLogs } from '../TerminalLogs';
import { LogEntry, MigrationStatus } from '../types';
import { APP_VERSION } from '../../../lib/migration-check';

interface MigrationStepProps {
    logs: LogEntry[];
    error: string | null;
    isMigrating: boolean;
    migrationStatus: MigrationStatus | null;
    accessToken: string;
    onTokenChange: (value: string) => void;
    onRunMigration: () => void;
    onBypass: () => void;
}

export function MigrationStep({
    logs,
    error,
    isMigrating,
    migrationStatus,
    accessToken,
    onTokenChange,
    onRunMigration,
    onBypass,
}: MigrationStepProps) {
    const needsToken = !accessToken;
    const canBypass = migrationStatus?.dbVersion !== null && !migrationStatus?.isUnknown;
    const isFreshInstall = migrationStatus?.dbVersion === null || migrationStatus?.isUnknown;

    return (
        <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    {isMigrating ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                        <Boxes className="w-5 h-5 text-primary" aria-hidden="true" />
                    )}
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Installation</h3>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    Applying schema DNA...
                </p>
            </div>

            <TerminalLogs logs={logs} />

            {!isMigrating && (
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="p-5 bg-primary/5 rounded-2xl space-y-4 border border-primary/20"
                >
                    <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                            {isFreshInstall
                                ? 'Empty project detected. Initialization is mandatory to install core AI systems.'
                                : `Version mismatch detected (v${migrationStatus?.dbVersion || '?.?'} → v${migrationStatus?.appVersion || APP_VERSION}). Normalization is recommended.`}
                        </p>

                        {/* Token Input for Manual Flow */}
                        {needsToken && (
                            <div className="space-y-2 pt-2 border-t border-primary/10">
                                <Label
                                    htmlFor="migration-token"
                                    className="text-[10px] font-bold uppercase tracking-widest text-primary/60"
                                >
                                    Management Token Required
                                </Label>
                                <div className="relative">
                                    <Key
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30"
                                        size={12}
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="migration-token"
                                        type="password"
                                        placeholder="sbp_xxxxxxxxxxxxxxxx"
                                        value={accessToken}
                                        onChange={(e) => onTokenChange(e.target.value)}
                                        className="pl-9 h-10 bg-background/50 border-primary/20 rounded-xl text-[11px]"
                                        aria-describedby="migration-token-help"
                                    />
                                </div>
                                <p id="migration-token-help" className="text-[9px] text-muted-foreground/60 italic px-1">
                                    Used once to run <code className="text-primary/70">migrate.sh</code> on your
                                    backend.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {/* Only allow bypass if DB is NOT fresh */}
                        {canBypass && (
                            <Button
                                variant="ghost"
                                onClick={onBypass}
                                className="flex-1 h-11 text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                                aria-label="Skip migration (risky)"
                            >
                                Bypass (Risk)
                            </Button>
                        )}
                        <Button
                            onClick={onRunMigration}
                            disabled={needsToken}
                            className="flex-1 h-11 bg-primary text-[10px] font-bold uppercase tracking-widest shadow-lg hover:shadow-primary/30"
                        >
                            {isFreshInstall ? 'Install Systems' : 'Normalize System'}
                        </Button>
                    </div>
                </motion.div>
            )}

            {error && (
                <div className="space-y-3">
                    <Alert
                        variant="destructive"
                        className="rounded-xl border-destructive/20 bg-destructive/5 text-destructive font-bold text-[11px]"
                    >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button
                        variant="outline"
                        onClick={onRunMigration}
                        className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                        Retry Installation
                    </Button>
                </div>
            )}
        </div>
    );
}
