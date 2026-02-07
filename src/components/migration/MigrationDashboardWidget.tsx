/**
 * MigrationDashboardWidget Component
 *
 * Prominent dashboard card that shows action required for pending migrations.
 * Cannot be hidden until migrations are complete.
 * Part of aggressive migration notification strategy.
 */

import { AlertCircle, Database, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import type { MigrationStatus } from "../../lib/migration-check";

interface MigrationDashboardWidgetProps {
    /** Migration status from checkMigrationStatus */
    status: MigrationStatus;
    /** Callback when user clicks to run migrations */
    onRunMigrations?: () => void;
}

export function MigrationDashboardWidget({
    status,
    onRunMigrations,
}: MigrationDashboardWidgetProps) {
    const features = [
        {
            icon: "🎯",
            title: "Smart rule exclusions",
            desc: "Negative conditions prevent false positives"
        },
        {
            icon: "🎚️",
            title: "Confidence threshold tuning",
            desc: "Fine-tune LLM matching per rule"
        },
        {
            icon: "⚡",
            title: "Template improvements",
            desc: "Better zero-config defaults"
        }
    ];

    return (
        <div className="rounded-lg border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-yellow-500 text-yellow-950 px-4 py-3 flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-sm">🔔 Action Required</h3>
                    <p className="text-xs opacity-90">Database updates available</p>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                        What's New:
                    </p>
                    <div className="space-y-2">
                        {features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="text-lg leading-none">{feature.icon}</span>
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-foreground">
                                        {feature.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {feature.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-2 border-t border-yellow-200 dark:border-yellow-800">
                    <Button
                        onClick={onRunMigrations}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-yellow-50"
                    >
                        <Database className="h-4 w-4 mr-2" />
                        Update Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                    💡 Your existing data will be preserved (safe migration)
                </p>
            </div>
        </div>
    );
}
