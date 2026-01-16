/**
 * MigrationPulseIndicator Component
 *
 * Shows a pulsing dot indicator when migration is needed but notification is dismissed.
 * Provides a subtle, persistent reminder without being intrusive.
 */

import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
// Tooltip not yet imported/ported, so simplified for now to just a Button
// If we want tooltip we need to port it too, but omitting for simplicity as it wasn't in list

interface MigrationPulseIndicatorProps {
    /** Callback when user clicks the indicator */
    onClick: () => void;
}

export function MigrationPulseIndicator({
    onClick,
}: MigrationPulseIndicatorProps) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onClick}
            title="Database Update Available"
        >
            <AlertTriangle className="h-5 w-5 text-red-700 dark:text-red-600" />
            {/* Pulsing dot */}
            <span className="absolute right-0 top-0 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-600/70 opacity-75 motion-safe:animate-ping motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-700 dark:bg-red-600" />
            </span>
            <span className="sr-only">Database migration pending</span>
        </Button>
    );
}
