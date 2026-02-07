/**
 * MigrationModal Component
 *
 * Displays detailed migration instructions in a modal dialog.
 * Shows step-by-step guide for users to run the migration command.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import {
    AlertTriangle,
    Copy,
    Check,
    ExternalLink,
    Info,
    Loader2,
    Terminal,
    Clock,
    Calendar,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "../Toast";
import { getSupabaseConfig } from "../../lib/supabase-config";
import type { MigrationStatus } from "../../lib/migration-check";

interface MigrationModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** Callback when modal is closed */
    onOpenChange: (open: boolean) => void;
    /** Migration status */
    status: MigrationStatus;
    /** Callback when user snoozes the reminder */
    onSnooze?: (until: Date) => void;
}

export function MigrationModal({
    open,
    onOpenChange,
    status,
    onSnooze,
}: MigrationModalProps) {
    const config = getSupabaseConfig();

    const handleSnooze = (hours: number) => {
        const until = new Date(Date.now() + hours * 60 * 60 * 1000);
        onSnooze?.(until);
        toast.success(`Reminder snoozed until ${until.toLocaleTimeString()}`);
        onOpenChange(false);
    };

    // Auto-migration state
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [accessToken, setAccessToken] = useState("");
    const logsEndRef = useRef<HTMLDivElement>(null);

    const projectId = useMemo(() => {
        const url = config?.url;
        if (!url) return "";
        try {
            const host = new URL(url).hostname;
            return host.split(".")[0] || "";
        } catch {
            return "";
        }
    }, [config?.url]);

    // Scroll logs to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [migrationLogs]);


    const handleAutoMigrate = async () => {
        if (!projectId) {
            toast.error("Missing Project ID");
            return;
        }
        if (!accessToken) {
            toast.error("Provide a Supabase Personal Access Token.");
            return;
        }

        setIsMigrating(true);
        setMigrationLogs(["Initializing migration..."]);

        try {
            const readStreamWithResult = async (
                reader: ReadableStreamDefaultReader<Uint8Array>,
            ): Promise<"success" | "failure" | null> => {
                const decoder = new TextDecoder();
                let buffer = "";
                let result: "success" | "failure" | null = null;

                const handleLine = (line: string) => {
                    const cleaned = line.trim();
                    if (!cleaned || !cleaned.startsWith("data: ")) return;

                    try {
                        const jsonStr = cleaned.substring(6);
                        const event = JSON.parse(jsonStr);

                        if (event.type === "done") {
                            if (event.data === "success" || event.data === "failed") {
                                result = event.data === "success" ? "success" : "failure";
                            }
                        } else if (event.data) {
                            // Add to logs if it's info, stdout, or stderr
                            setMigrationLogs((prev) => [...prev, event.data]);
                        }
                    } catch (e) {
                        console.error("Failed to parse SSE line:", cleaned, e);
                    }
                };

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    lines.forEach(handleLine);
                }

                buffer += decoder.decode();
                if (buffer) handleLine(buffer);

                return result;
            };

            // Step 1: Run migration (includes Edge Functions deployment)
            setMigrationLogs((prev) => [...prev, "", "📦 Database Migration & Edge Functions Deployment"]);
            const migrateResponse = await fetch("/api/migrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectRef: projectId,
                    accessToken,
                }),
            });

            if (!migrateResponse.ok) {
                throw new Error(
                    `Migration failed: ${migrateResponse.status} ${migrateResponse.statusText}`,
                );
            }

            const migrateReader = migrateResponse.body?.getReader();
            if (!migrateReader) throw new Error("No migration response stream received.");

            const migrationResult = await readStreamWithResult(migrateReader);
            if (migrationResult !== "success") {
                throw new Error("Migration did not complete successfully");
            }

            // Migration complete (includes Edge Functions deployment)
            setMigrationLogs((prev) => [
                ...prev,
                "",
                "═".repeat(60),
                "✅ Setup Complete!",
                "",
                "✓ Database schema updated",
                "✓ Edge Functions deployed",
                "",
                "🎉 Your Email Automator is ready to use!",
                "📝 The application will reload automatically...",
                "═".repeat(60),
            ]);

            // Auto-reload after 3 seconds
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (err) {
            console.error(err);
            setMigrationLogs((prev) => [
                ...prev,
                "",
                `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
            ]);
            toast.error("Setup failed. Check logs for details.");
        } finally {
            setIsMigrating(false);
        }
    };


    return (
        <Dialog
            open={open}
            onOpenChange={(val) => !isMigrating && onOpenChange(val)}
        >
            <DialogContent className="max-h-[90vh] sm:max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-600" />
                        Database Setup Required
                    </DialogTitle>
                    <DialogDescription>
                        Your application version ({status.appVersion}) requires database migration and Edge Functions deployment to function correctly.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Overview Alert */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Why is this needed?</strong>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                                <li>
                                    Updates your database schema to match version {status.appVersion}
                                </li>
                                <li>
                                    Deploys Edge Functions (API endpoints) to your Supabase project
                                </li>
                                <li>
                                    Enables new features and performance improvements
                                </li>
                                <li>
                                    Your existing data will be preserved (safe migration)
                                </li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    {/* Automatic Setup (Now the only option) */}
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <h3 className="text-lg font-semibold mb-2">
                                Automated Setup
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Run database migration and deploy Edge Functions directly from your browser. A Supabase Personal Access Token is required to authenticate with your project.
                            </p>

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="project-id">
                                        Supabase Project ID
                                    </Label>
                                    <Input
                                        id="project-id"
                                        value={projectId}
                                        disabled
                                        readOnly
                                        className="bg-muted"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="access-token">
                                            Access Token
                                        </Label>
                                        <a
                                            href="https://supabase.com/dashboard/account/tokens"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            Generate Token <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <Input
                                        id="access-token"
                                        type="password"
                                        placeholder="sbp_..."
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        disabled={isMigrating}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        This token is used only for this migration and is not stored.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleAutoMigrate}
                                    disabled={isMigrating || !accessToken}
                                    className="w-full"
                                >
                                    {isMigrating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Running Setup...
                                        </>
                                    ) : (
                                        <>
                                            <Terminal className="mr-2 h-4 w-4" />
                                            Start Setup
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Logs Terminal */}
                        <div className="rounded-lg border bg-black text-white font-mono text-xs p-4 h-64 overflow-y-auto">
                            {migrationLogs.length === 0 ? (
                                <div className="text-gray-500 italic">
                                    Waiting to start...
                                </div>
                            ) : (
                                migrationLogs.map((log, i) => (
                                    <div key={i} className="mb-1 whitespace-pre-wrap">
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {/* Troubleshooting */}
                    <Alert className="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20">
                        <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-600" />
                        <AlertDescription>
                            <strong>Troubleshooting</strong>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                                <li>
                                    Ensure your Access Token has <code>read</code> and <code>write</code> permissions.
                                </li>
                                <li>
                                    Verify that your Supabase Project ID is correct and active.
                                </li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <div className="flex gap-2 flex-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSnooze(1)}
                            disabled={isMigrating}
                            className="flex-1 sm:flex-initial"
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Remind in 1 Hour
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSnooze(24)}
                            disabled={isMigrating}
                            className="flex-1 sm:flex-initial"
                        >
                            <Calendar className="h-4 w-4 mr-2" />
                            Remind Tomorrow
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
