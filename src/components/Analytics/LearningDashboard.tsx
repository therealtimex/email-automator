import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, ShieldCheck, UserCheck, Star, Zap } from "lucide-react";
import { api } from '@/lib/api';

interface LearningMetrics {
    total_classifications: number;
    correct_classifications: number;
    drafts_generated: number;
    drafts_edited: number;
    category_patterns: Record<string, string>;
    vip_senders: string[];
}

export const LearningDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    const loadMetrics = useCallback(async () => {
        try {
            const response = await api.getLearningMetrics();
            const data = response.data;

            if (data) {
                setMetrics({
                    total_classifications: data.total_classifications || 0,
                    correct_classifications: data.correct_classifications || 0,
                    drafts_generated: data.drafts_generated || 0,
                    drafts_edited: data.drafts_edited || 0,
                    category_patterns: data.category_patterns || {},
                    vip_senders: data.vip_senders || []
                });
            } else {
                setMetrics({
                    total_classifications: 0,
                    correct_classifications: 0,
                    drafts_generated: 0,
                    drafts_edited: 0,
                    category_patterns: {},
                    vip_senders: []
                });
            }
        } catch (error) {
            console.error('Failed to load learning metrics', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Brain className="w-5 h-5 animate-pulse text-primary" /> Loading AI DNA...
        </div>;
    }

    if (!metrics) return null;

    const accuracy = metrics.total_classifications > 0
        ? Math.round((metrics.correct_classifications / metrics.total_classifications) * 100)
        : 100;

    const timeSaved = Math.round(metrics.drafts_generated * 5); // Assume 5 mins per draft

    // Calculate drafts edited rate (lower is better for accuracy, but we want to show improvement)
    // Let's show "Draft Acceptance Rate"
    const acceptanceRate = metrics.drafts_generated > 0
        ? Math.round(((metrics.drafts_generated - metrics.drafts_edited) / metrics.drafts_generated) * 100)
        : 100;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
                        <Brain className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{accuracy}%</div>
                        <p className="text-xs text-muted-foreground">
                            Classification confidence
                        </p>
                        <Progress value={accuracy} className="mt-3 h-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{timeSaved}m</div>
                        <p className="text-xs text-muted-foreground">
                            Est. minutes saved drafting
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Learned Patterns</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Object.keys(metrics.category_patterns).length}</div>
                        <p className="text-xs text-muted-foreground">
                            Domain rules learned
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">VIP Network</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.vip_senders.length}</div>
                        <p className="text-xs text-muted-foreground">
                            High-priority contacts
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="patterns" className="w-full">
                <TabsList>
                    <TabsTrigger value="patterns">Domain Patterns</TabsTrigger>
                    <TabsTrigger value="vips">VIP Senders</TabsTrigger>
                </TabsList>

                <TabsContent value="patterns" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Learned Categorization Rules</CardTitle>
                            <CardDescription>
                                The AI automatically learns to classify emails from these domains based on your corrections.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.entries(metrics.category_patterns).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-secondary/10">
                                        <Zap className="h-10 w-10 mb-4 opacity-50" />
                                        <p>No patterns learned yet.</p>
                                        <p className="text-xs mt-1">Correct some email categories in the Dashboard to teach the AI!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(metrics.category_patterns).map(([domain, category]) => (
                                            <div key={domain} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    <span className="font-mono text-sm">{domain}</span>
                                                </div>
                                                <Badge variant="secondary" className="capitalize">
                                                    {category}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vips" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Identified VIP Senders</CardTitle>
                            <CardDescription>
                                Contacts that are automatically flagged as High Priority.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {metrics.vip_senders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-secondary/10">
                                        <UserCheck className="h-10 w-10 mb-4 opacity-50" />
                                        <p>No VIPs identified yet.</p>
                                        <p className="text-xs mt-1">Interacting frequently with contacts will elevate them to VIP status.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {metrics.vip_senders.map((email) => (
                                            <Badge key={email} variant="outline" className="pl-1 pr-3 py-1.5 text-sm flex items-center gap-2 bg-secondary/20">
                                                <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                </div>
                                                {email}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
