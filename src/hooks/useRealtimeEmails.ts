import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Email } from '../lib/types';

interface UseRealtimeEmailsOptions {
    userId?: string;
    onInsert?: (email: Email) => void;
    onUpdate?: (email: Email) => void;
    onDelete?: (emailId: string) => void;
    enabled?: boolean;
}

export function useRealtimeEmails({
    userId,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
}: UseRealtimeEmailsOptions) {
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!enabled || !userId) return;

        // Subscribe to emails table changes
        const channel = supabase
            .channel('emails-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'emails',
                },
                (payload) => {
                    onInsert?.(payload.new as Email);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'emails',
                },
                (payload) => {
                    onUpdate?.(payload.new as Email);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'emails',
                },
                (payload) => {
                    onDelete?.(payload.old.id);
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [userId, enabled, onInsert, onUpdate, onDelete]);

    return {
        isSubscribed: !!channelRef.current,
    };
}

export function useRealtimeProcessingLogs({
    userId,
    onNewLog,
    enabled = true,
}: {
    userId?: string;
    onNewLog?: (log: any) => void;
    enabled?: boolean;
}) {
    useEffect(() => {
        if (!enabled || !userId) return;

        const channel = supabase
            .channel('processing-logs-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'processing_logs',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        onNewLog?.(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, enabled, onNewLog]);
}
