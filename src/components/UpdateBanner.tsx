/**
 * UpdateBanner Component
 *
 * Displays when a newer version is available on npm.
 * Solves the npx cache staleness issue with a friendly prompt to update.
 */

import { useState } from 'react';
import { RefreshCw, X, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { dismissUpdatePrompt, triggerAppRestart, type VersionInfo } from '../lib/version-check';

interface UpdateBannerProps {
    versionInfo: VersionInfo;
    onDismiss?: () => void;
}

export function UpdateBanner({ versionInfo, onDismiss }: UpdateBannerProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isRestarting, setIsRestarting] = useState(false);

    if (!isVisible) return null;

    const handleDismiss = () => {
        dismissUpdatePrompt();
        setIsVisible(false);
        onDismiss?.();
    };

    const handleUpdate = () => {
        setIsRestarting(true);

        // Trigger restart after a short delay to show the loading state
        setTimeout(() => {
            triggerAppRestart();
        }, 500);
    };

    const handleViewChangelog = () => {
        if (versionInfo.updateUrl) {
            window.open(versionInfo.updateUrl, '_blank');
        }
    };

    return (
        <div className="fixed right-4 top-16 z-50 max-w-sm animate-in slide-in-from-top-5">
            <div className="rounded-lg border border-blue-500 bg-blue-50 p-4 shadow-lg dark:bg-blue-950/90 dark:border-blue-600">
                <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-500 mt-0.5" />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Update Available
                            </p>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 -mr-1 -mt-1 text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/30"
                                onClick={handleDismiss}
                            >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Dismiss</span>
                            </Button>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            Version {versionInfo.latest} is now available (you're on {versionInfo.current})
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                onClick={handleUpdate}
                                disabled={isRestarting}
                            >
                                {isRestarting ? (
                                    <>
                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Update Now
                                    </>
                                )}
                            </Button>
                            {versionInfo.updateUrl && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/30"
                                    onClick={handleViewChangelog}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    What's New
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/30"
                                onClick={handleDismiss}
                            >
                                Later
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
