/**
 * MigrationBanner Component (Enhanced)
 *
 * Persistent banner that cannot be permanently dismissed - only snoozed.
 * Displays at top of app with snooze options (1 hour, tomorrow).
 * Aggressive approach ensures users don't miss critical migrations.
 */

import { useState } from "react";
import { AlertTriangle, Clock, Calendar, ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "../Toast";
import type { MigrationStatus } from "../../lib/migration-check";

interface MigrationBannerProps {
    /** Migration status from checkMigrationStatus */
    status: MigrationStatus;
    /** Callback when banner is snoozed */
    onSnooze?: (until: Date) => void;
    /** Callback when user clicks to open modal */
    onOpenModal?: () => void;
}

export function MigrationBanner({
    status,
    onSnooze,
    onOpenModal,
}: MigrationBannerProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const handleSnooze = (hours: number) => {
        const until = new Date(Date.now() + hours * 60 * 60 * 1000);
        onSnooze?.(until);
        toast.success(`Reminder snoozed until ${until.toLocaleTimeString()}`);
    };

    const features = [
        "Per-rule confidence threshold tuning",
        "Smart negative conditions (exclusion logic)",
        "Template improvements with zero-config UX",
    ];

    // Minimized pill view
    if (isMinimized) {
        return (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-yellow-950 rounded-full shadow-lg hover:bg-yellow-400 transition-colors text-sm font-medium"
                >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Database updates available</span>
                </button>
            </div>
        );
    }

    // Full banner view
    return (
        <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top-5">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-yellow-950 px-4 py-3 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-base">
                                        ⚠️ Database Updates Available
                                    </p>
                                    <p className="text-sm opacity-90 mt-0.5">
                                        New features ready: Per-rule confidence, Smart exclusions, Zero-config templates
                                    </p>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-yellow-950 hover:bg-yellow-600/30"
                                    onClick={() => setIsMinimized(true)}
                                >
                                    <Minimize2 className="h-4 w-4" />
                                    <span className="sr-only">Minimize</span>
                                </Button>
                            </div>

                            {/* Details expandable section */}
                            {showDetails && (
                                <div className="bg-yellow-950/20 rounded-md p-3 space-y-2">
                                    <p className="text-xs font-medium">What's new:</p>
                                    <ul className="text-xs space-y-1 ml-4">
                                        {features.map((feature, i) => (
                                            <li key={i}>• {feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    className="h-8 bg-yellow-950 hover:bg-yellow-900 text-yellow-50"
                                    onClick={onOpenModal}
                                >
                                    Run Now
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-yellow-950 text-yellow-950 hover:bg-yellow-950/10"
                                    onClick={() => handleSnooze(1)}
                                >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Remind in 1 Hour
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-yellow-950 text-yellow-950 hover:bg-yellow-950/10"
                                    onClick={() => handleSnooze(24)}
                                >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Remind Tomorrow
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-yellow-950 hover:bg-yellow-950/10"
                                    onClick={() => setShowDetails(!showDetails)}
                                >
                                    {showDetails ? (
                                        <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Hide Details
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            What's Changing?
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
