import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";
import { LearningMetrics } from "../../lib/types";
import { Brain, TrendingUp, CheckCircle, Edit3, XCircle, Zap } from "lucide-react";
import { Progress } from "../ui/progress";

export function LearningDashboard() {
    const { state } = useApp();
    const { user } = state;
    const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchMetrics = async () => {
            try {
                const { data, error } = await supabase
                    .from('learning_metrics')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
                setMetrics(data);
            } catch (error) {
                console.error('Error fetching learning metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [user]);

    if (loading) {
        return <div className="p-4 text-center">Loading insights...</div>;
    }

    // Default values if no metrics exist yet
    const accuracy = metrics ?
        Math.round((metrics.correct_classifications / (metrics.total_classifications || 1)) * 100) : 0;

    const draftQuality = metrics ?
        Math.round((metrics.drafts_sent_unedited / (metrics.drafts_generated || 1)) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">IQ Score (Accuracy)</CardTitle>
                        <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.total_classifications ? `${accuracy}%` : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">
                            Based on {metrics?.total_classifications || 0} classifications
                        </p>
                        <Progress value={accuracy} className="mt-2" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Draft Quality</CardTitle>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.drafts_generated ? `${draftQuality}%` : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">
                            Drafts sent without edits
                        </p>
                        <Progress value={draftQuality} className="mt-2" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Corrections</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.drafts_edited || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Drafts improved by you
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.drafts_dismissed || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Drafts rejected
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Recent Learnings</CardTitle>
                    <CardDescription>
                        Patterns and preferences I've learned from your feedback.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {(!state.settings?.category_patterns || Object.keys(state.settings.category_patterns).length === 0) && (
                            <div className="flex items-center justify-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <Zap className="mr-2 h-4 w-4" />
                                No patterns learned yet. Correct some email categories to teach me!
                            </div>
                        )}

                        {state.settings?.category_patterns && Object.entries(state.settings.category_patterns).map(([domain, category]) => (
                            <div key={domain} className="flex items-center">
                                <span className="flex h-2 w-2 rounded-full bg-sky-500 mr-2" />
                                <span className="text-sm">
                                    I learned that emails from <span className="font-semibold">{domain}</span> are usually <span className="font-semibold capitalize">{category}</span>.
                                </span>
                            </div>
                        ))}
                        {state.settings?.preferred_tone && (
                            <div className="flex items-center">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                <span className="text-sm">
                                    I've adjusted your preferred tone to <span className="font-semibold capitalize">{state.settings.preferred_tone}</span> based on your edits.
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
