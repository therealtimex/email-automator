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
}

interface CodeBlockProps {
    code: string;
    label?: string;
}

function CodeBlock({ code, label }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const canCopy =
        typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;

    const handleCopy = async () => {
        if (!canCopy) {
            toast.error("Clipboard not supported");
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
            toast.success("Copied to clipboard");
        } catch (error) {
            console.error("Failed to copy:", error);
            toast.error("Failed to copy to clipboard");
        }
    };

    return (
        <div className="relative">
            {label && (
                <div className="mb-2 text-sm font-medium text-muted-foreground">
                    {label}
                </div>
            )}
            <div className="group relative">
                <pre className="overflow-hidden rounded-md bg-muted p-3 pr-12 text-sm">
                    <code className="block whitespace-pre-wrap break-all">{code}</code>
                </pre>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={handleCopy}
                    disabled={!canCopy}
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                        {copied ? "Copied" : "Copy code"}
                    </span>
                </Button>
            </div>
        </div>
    );
}

export function MigrationModal({
    open,
    onOpenChange,
    status,
}: MigrationModalProps) {
    const config = getSupabaseConfig();

    // Auto-migration state
    const [showAutoMigrate, setShowAutoMigrate] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [dbPassword, setDbPassword] = useState("");
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

        setIsMigrating(true);
        setMigrationLogs(["Initializing migration..."]);

        try {
            const response = await fetch("/api/migrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectRef: projectId,
                    dbPassword,
                    accessToken,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `Server returned ${response.status}: ${response.statusText}`,
                );
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response stream received.");

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split("\n").filter(Boolean);
                setMigrationLogs((prev) => [...prev, ...lines]);
            }
        } catch (err) {
            console.error(err);
            setMigrationLogs((prev) => [
                ...prev,
                `Error: ${err instanceof Error ? err.message : String(err)}`,
            ]);
            toast.error("Migration failed. Check logs for details.");
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
                        Database Migration Required
                    </DialogTitle>
                    <DialogDescription>
                        Your application version ({status.appVersion}) requires a database schema update to function correctly.
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
                                    Enables new features and performance improvements
                                </li>
                                <li>
                                    Your existing data will be preserved (safe migration)
                                </li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    {/* Mode Selection Tabs */}
                    <div className="flex border-b">
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${showAutoMigrate ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            onClick={() => setShowAutoMigrate(true)}
                        >
                            Automatic (Recommended)
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!showAutoMigrate ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            onClick={() => setShowAutoMigrate(false)}
                        >
                            Manual CLI
                        </button>
                    </div>

                    {showAutoMigrate ? (
                        <div className="space-y-4 py-2">
                            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                                <h3 className="text-lg font-semibold mb-2">
                                    Automated Migration
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Run the migration directly from your browser. Requires your database password.
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
                                                Access Token (Optional)
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
                                            Recommended for more reliable authentication.
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="db-password">
                                            Database Password
                                        </Label>
                                        <Input
                                            id="db-password"
                                            type="password"
                                            placeholder="Your database password"
                                            value={dbPassword}
                                            onChange={(e) => setDbPassword(e.target.value)}
                                            disabled={isMigrating}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Required if no access token is provided.
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleAutoMigrate}
                                        disabled={isMigrating}
                                        className="w-full"
                                    >
                                        {isMigrating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Migrating...
                                            </>
                                        ) : (
                                            <>
                                                <Terminal className="mr-2 h-4 w-4" />
                                                Start Migration
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
                    ) : (
                        // Manual Instructions
                        <>
                            {/* Step 1: Prerequisites */}
                            <div>
                                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                        1
                                    </span>
                                    Prerequisites
                                </h4>
                                <div className="ml-8 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        You will need the following before proceeding:
                                    </p>
                                    <ul className="list-inside list-disc space-y-1 text-sm">
                                        <li>
                                            Supabase CLI installed
                                        </li>
                                        <li>
                                            Project ID:{" "}
                                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                                {projectId || "your-project-id"}
                                            </code>
                                        </li>
                                        <li>
                                            Database Password
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Step 2: Install Supabase CLI */}
                            <div>
                                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                        2
                                    </span>
                                    Install Supabase CLI
                                </h4>
                                <div className="ml-8 space-y-3">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                            MacOS (Brew)
                                        </p>
                                        <CodeBlock code="brew install supabase/tap/supabase" />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                            Windows (Scoop)
                                        </p>
                                        <CodeBlock
                                            code={`scoop bucket add supabase https://github.com/supabase/scoop-bucket.git\nscoop install supabase`}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                            NPM (Universal)
                                        </p>
                                        <CodeBlock code="npm install -g supabase" />
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Run Migration */}
                            <div>
                                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                        3
                                    </span>
                                    Run Migration
                                </h4>
                                <div className="ml-8 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Run the built-in migration tool:
                                    </p>
                                    <CodeBlock code="npx email-automator migrate" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Troubleshooting */}
                    <Alert className="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20">
                        <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-600" />
                        <AlertDescription>
                            <strong>Troubleshooting</strong>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                                <li>
                                    Try logging out: <code>supabase logout</code>
                                </li>
                                <li>
                                    Verify your database password is correct
                                </li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isMigrating}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
