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
    Minimize2,
    ChevronDown,
    ChevronUp,
    Code,
    CheckCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useTerminal } from '../context/TerminalContext';

export function LiveTerminal() {
    const [events, setEvents] = useState<ProcessingEvent[]>([]);
    const { isExpanded, setIsExpanded } = useTerminal();
    const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
    
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
                    
                    // Auto-expand errors
                    if (newEvent.event_type === 'error') {
                        setExpandedEvents(prev => ({ ...prev, [newEvent.id]: true }));
                    }

                    setEvents((prev) => {
                        // Insert at the beginning (descending order)
                        const updated = [newEvent, ...prev];
                        if (updated.length > 100) return updated.slice(0, 100);
                        return updated;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchRecentEvents = async () => {
        const { data } = await supabase
            .from('processing_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (data) {
            setEvents(data);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getIcon = (event: ProcessingEvent) => {
        if (event.details?.is_completion) return <CheckCircle className="w-3 h-3 text-emerald-500" />;
        
        switch (event.event_type) {
            case 'analysis': return <Brain className="w-3 h-3 text-purple-500" />;
            case 'action': return <Zap className="w-3 h-3 text-emerald-500" />;
            case 'error': return <AlertTriangle className="w-3 h-3 text-red-500" />;
            default: return <Info className="w-3 h-3 text-blue-500" />;
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
                    className="shadow-lg bg-primary text-primary-foreground hover:opacity-90 border border-border"
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
        <Card className="fixed bottom-4 right-4 z-50 w-[550px] h-[650px] flex flex-col shadow-2xl border-border bg-background/95 text-foreground backdrop-blur-md animate-in slide-in-from-bottom-10">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between sticky top-0 bg-background/95 z-20">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-mono font-bold">Agent Terminal</CardTitle>
                    <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">
                        <Activity className="w-3 h-3" />
                        LIVE
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] font-mono hover:bg-secondary"
                        onClick={() => setEvents([])}
                    >
                        Clear
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-secondary"
                        onClick={() => setIsExpanded(false)}
                    >
                        <Minimize2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-6 custom-scrollbar">
                {events.length === 0 && (
                    <div className="text-center text-muted-foreground py-20 italic">
                        Waiting for agent activity...
                    </div>
                )}
                
                {events.map((event, i) => (
                    <div key={event.id} className="relative pl-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Connecting Line */}
                        {i !== events.length - 1 && (
                            <div className="absolute left-[13px] top-7 bottom-[-24px] w-[1px] bg-border" />
                        )}
                        
                        {/* Icon Badge */}
                        <div className={cn(
                            "absolute left-0 top-0 w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center z-10 shadow-sm",
                            event.event_type === 'error' && "border-red-500/50 bg-red-500/5",
                            event.event_type === 'analysis' && "border-purple-500/50 bg-purple-500/5",
                            event.event_type === 'action' && "border-emerald-500/50 bg-emerald-500/5",
                            event.details?.is_completion && "border-emerald-500/50 bg-emerald-500/5"
                        )}>
                            {getIcon(event)}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "font-bold uppercase tracking-tight text-[10px]",
                                        event.event_type === 'info' && "text-muted-foreground",
                                        event.event_type === 'analysis' && "text-purple-600 dark:text-purple-400",
                                        event.event_type === 'action' && "text-emerald-600 dark:text-emerald-400",
                                        event.event_type === 'error' && "text-red-600 dark:text-red-400",
                                    )}>
                                        {event.agent_state}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60">{formatTime(event.created_at)}</span>
                                </div>
                                {(event.details?.system_prompt || event.details?._raw_response || event.details?.raw_response) && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => toggleExpand(event.id)}
                                    >
                                        {expandedEvents[event.id] ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                                        Details
                                    </Button>
                                )}
                            </div>

                            {/* Detailed Content */}
                            {event.event_type === 'analysis' && event.details ? (
                                <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                            event.details.is_useless ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                        )}>
                                            {event.details.is_useless ? 'USELESS' : 'RELEVANT'}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 uppercase">
                                            {event.details.category}
                                        </span>
                                    </div>
                                    <p className="text-foreground/90 italic leading-relaxed">
                                        "{event.details.summary}"
                                    </p>
                                    {event.details.suggested_actions && event.details.suggested_actions.length > 0 && (
                                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                                            {event.details.suggested_actions.map((a: string) => (
                                                <div key={a} className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                                                    <Zap className="w-2.5 h-2.5" />
                                                    {a}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {event.details.usage && (
                                        <div className="pt-1.5 flex items-center gap-3 text-[9px] text-muted-foreground/70 border-t border-purple-500/10 mt-1">
                                            <span>Tokens: {event.details.usage.prompt_tokens} (in) + {event.details.usage.completion_tokens} (out) = <span className="text-purple-500 font-bold">{event.details.usage.total_tokens}</span></span>
                                        </div>
                                    )}
                                </div>
                            ) : event.event_type === 'action' && event.details ? (
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mb-1 uppercase text-[9px] tracking-widest">Execution Complete</p>
                                    <p className="text-foreground font-medium">
                                        {event.details.action === 'delete' && 'Moved to Trash'}
                                        {event.details.action === 'archive' && 'Archived Email'}
                                        {event.details.action === 'draft' && 'Drafted Reply'}
                                        {event.details.action === 'read' && 'Marked as Read'}
                                        {event.details.action === 'star' && 'Starred Email'}
                                        {!['delete', 'archive', 'draft', 'read', 'star'].includes(event.details.action) && event.details.action}
                                    </p>
                                    {event.details.reason && (
                                        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            {event.details.reason}
                                        </p>
                                    )}
                                </div>
                            ) : event.event_type === 'error' && event.details ? (
                                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 text-red-600 dark:text-red-400 font-medium">
                                    {typeof event.details.error === 'object' 
                                        ? (event.details.error.message || JSON.stringify(event.details.error)) 
                                        : event.details.error}
                                </div>
                            ) : event.details?.is_completion ? (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[9px] tracking-[0.2em]">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Batch Sync Finished
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-muted-foreground uppercase">Processed</p>
                                            <p className="text-sm font-bold">{event.details.total_processed || 0}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-muted-foreground uppercase">Actions</p>
                                            <p className="text-sm font-bold text-emerald-500">{(event.details.deleted || 0) + (event.details.drafted || 0)}</p>
                                        </div>
                                    </div>
                                    {event.details.errors > 0 && (
                                        <p className="text-[10px] text-red-500 font-bold pt-1 border-t border-emerald-500/10">
                                            ⚠️ {event.details.errors} items failed to process.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground leading-relaxed">
                                    {event.details?.message || JSON.stringify(event.details)}
                                </p>
                            )}

                            {/* Collapsible Technical Details */}
                            {expandedEvents[event.id] && (
                                <div className="mt-2 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    {event.details?.system_prompt && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                                <Code className="w-3 h-3" /> System Prompt
                                            </div>
                                            <div className="bg-secondary/50 rounded-md p-3 border border-border overflow-x-auto">
                                                <pre className="whitespace-pre-wrap break-words text-[10px] leading-normal text-muted-foreground select-all">
                                                    {event.details.system_prompt}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                    {event.details?.content_preview && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                                <Code className="w-3 h-3" /> Input Content (Cleaned)
                                            </div>
                                            <div className="bg-secondary/50 rounded-md p-3 border border-border">
                                                <p className="whitespace-pre-wrap break-words text-[10px] text-muted-foreground">
                                                    {event.details.content_preview}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {event.details?._raw_response && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                                <Code className="w-3 h-3" /> Raw LLM JSON Output
                                            </div>
                                            <div className="bg-secondary/50 rounded-md p-3 border border-border overflow-x-auto">
                                                <pre className="text-[10px] text-muted-foreground select-all">
                                                    {JSON.stringify(JSON.parse(event.details._raw_response), null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                    {event.details?.raw_response && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                                <Code className="w-3 h-3" /> Raw Response (from Error)
                                            </div>
                                            <div className="bg-secondary/50 rounded-md p-3 border border-border overflow-x-auto">
                                                <pre className="text-[10px] text-muted-foreground select-all whitespace-pre-wrap">
                                                    {typeof event.details.raw_response === 'object' 
                                                        ? JSON.stringify(event.details.raw_response, null, 2) 
                                                        : event.details.raw_response}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}