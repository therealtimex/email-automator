import { useEffect, useState } from 'react';
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
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        console.log('[useRealtimeEmails] Effect running, enabled:', enabled, 'userId:', userId);

        if (!enabled || !userId) {
            console.log('[useRealtimeEmails] Skipping subscription - not enabled or no userId');
            setIsSubscribed(false);
            return;
        }

        console.log('[useRealtimeEmails] Setting up subscription for user:', userId);

        // Subscribe to emails table changes
        const channel = supabase
            .channel(`emails-realtime-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'emails',
                },
                (payload) => {
                    console.log('[useRealtimeEmails] Raw event received:', payload.eventType, payload);
                    if (payload.eventType === 'INSERT') {
                        console.log('[useRealtimeEmails] Calling onInsert for:', payload.new?.id);
                        onInsert?.(payload.new as Email);
                    } else if (payload.eventType === 'UPDATE') {
                        console.log('[useRealtimeEmails] Calling onUpdate for:', payload.new?.id);
                        onUpdate?.(payload.new as Email);
                    } else if (payload.eventType === 'DELETE') {
                        console.log('[useRealtimeEmails] Calling onDelete for:', payload.old?.id);
                        onDelete?.(payload.old.id);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('[useRealtimeEmails] Subscription status:', status, err || '');
                setIsSubscribed(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, enabled, onInsert, onUpdate, onDelete]);

    return {
        isSubscribed,
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
