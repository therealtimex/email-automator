import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ProcessingEvent } from '../lib/types';
import { 
    Terminal, 
    Brain, 
    Zap, 
    Info, 
    AlertTriangle, 
    Activity,
    Minimize2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';

export function LiveTerminal() {
    const [events, setEvents] = useState<ProcessingEvent[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Initial fetch of recent events
    useEffect(() => {
        fetchRecentEvents();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('processing_events_feed')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'processing_events',
                },
                (payload) => {
                    const newEvent = payload.new as ProcessingEvent;
                    setEvents((prev) => {
                        // Keep only last 100 events to prevent memory issues
                        const updated = [...prev, newEvent];
                        if (updated.length > 100) return updated.slice(updated.length - 100);
                        return updated;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (bottomRef.current && isExpanded) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [events, isExpanded]);

    const fetchRecentEvents = async () => {
        const { data } = await supabase
            .from('processing_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (data) {
            // Reverse so oldest is top (terminal style)
            setEvents(data.reverse());
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'analysis': return <Brain className="w-3 h-3 text-purple-400" />;
            case 'action': return <Zap className="w-3 h-3 text-emerald-400" />;
            case 'error': return <AlertTriangle className="w-3 h-3 text-red-400" />;
            default: return <Info className="w-3 h-3 text-blue-400" />;
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (!isExpanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button 
                    onClick={() => setIsExpanded(true)}
                    className="shadow-lg bg-black text-white hover:bg-gray-900 border border-gray-800"
                >
                    <Terminal className="w-4 h-4 mr-2" />
                    Live Activity
                    {events.length > 0 && (
                        <span className="ml-2 flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <Card className="fixed bottom-4 right-4 z-50 w-[500px] h-[600px] flex flex-col shadow-2xl border-gray-800 bg-black/95 text-gray-300 backdrop-blur-md animate-in slide-in-from-bottom-10">
            <CardHeader className="py-3 px-4 border-b border-gray-800 flex flex-row items-center justify-between sticky top-0 bg-black/95 z-10">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-500" />
                    <CardTitle className="text-sm font-mono text-white">Agent Terminal</CardTitle>
                    <div className="flex items-center gap-1 text-[10px] text-green-500 bg-green-950/30 px-2 py-0.5 rounded-full border border-green-900">
                        <Activity className="w-3 h-3" />
                        LIVE
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-gray-800"
                    onClick={() => setIsExpanded(false)}
                >
                    <Minimize2 className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-4 custom-scrollbar">
                {events.length === 0 && (
                    <div className="text-center text-gray-600 py-10">
                        Waiting for agent activity...
                    </div>
                )}
                
                {events.map((event, i) => (
                    <div key={event.id} className="relative pl-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        {/* Connecting Line */}
                        {i !== events.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-[-16px] w-[1px] bg-gray-800" />
                        )}
                        
                        {/* Icon Badge */}
                        <div className={`absolute left-0 top-0 w-6 h-6 rounded-full border border-gray-800 bg-gray-900 flex items-center justify-center z-10`}>
                            {getIcon(event.event_type)}
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="font-bold text-gray-400">{event.agent_state}</span>
                                <span className="text-[10px] opacity-50">{formatTime(event.created_at)}</span>
                            </div>

                            {/* Detailed Content */}
                            {event.event_type === 'analysis' && event.details ? (
                                <div className="mt-1 bg-indigo-950/20 border border-indigo-500/20 rounded p-3">
                                    <div className="flex gap-2 mb-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                            event.details.is_useless ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                                        }`}>
                                            {event.details.is_useless ? 'USELESS' : 'RELEVANT'}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] border bg-blue-500/10 text-blue-400 border-blue-500/20 capitalize">
                                            {event.details.category}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] border bg-purple-500/10 text-purple-400 border-purple-500/20 capitalize">
                                            {event.details.sentiment}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 leading-relaxed opacity-90">
                                        "{event.details.summary}"
                                    </p>
                                    {event.details.suggested_action && event.details.suggested_action !== 'none' && (
                                        <div className="mt-2 text-xs flex items-center gap-1 text-emerald-400">
                                            <Zap className="w-3 h-3" />
                                            Suggestion: <span className="uppercase">{event.details.suggested_action}</span>
                                        </div>
                                    )}
                                </div>
                            ) : event.event_type === 'action' && event.details ? (
                                <div className="mt-1 bg-emerald-950/20 border border-emerald-500/20 rounded p-3">
                                    <p className="text-emerald-400 font-bold mb-1 uppercase text-[10px] tracking-wider">Action Executed</p>
                                    <p className="text-white">
                                        {event.details.action === 'delete' && 'Moved to Trash'}
                                        {event.details.action === 'archive' && 'Archived Email'}
                                        {event.details.action === 'draft' && 'Drafted Reply'}
                                        {event.details.action === 'read' && 'Marked as Read'}
                                        {event.details.action === 'star' && 'Starred Email'}
                                        {!['delete', 'archive', 'draft', 'read', 'star'].includes(event.details.action) && event.details.action}
                                    </p>
                                    {event.details.reason && (
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            Why: {event.details.reason}
                                        </p>
                                    )}
                                </div>
                            ) : event.event_type === 'error' && event.details ? (
                                <div className="mt-1 bg-red-950/20 border border-red-500/20 rounded p-2 text-red-300">
                                    {event.details.error}
                                </div>
                            ) : (
                                <p className="text-gray-400 break-words">
                                    {event.details?.message || JSON.stringify(event.details)}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </CardContent>
        </Card>
    );
}
