import { UserPersona } from "../../lib/types";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { Inbox, Timer, Target, Clock, AlertTriangle, BarChart3, ShieldAlert } from "lucide-react";

interface Step4Props {
    data: UserPersona;
    updateData: (updates: Partial<UserPersona>) => void;
}

const GOALS = [
    { id: 'inbox_zero', label: 'Inbox Zero Daily', icon: Inbox },
    { id: 'respond_faster', label: 'Respond Faster', icon: Timer },
    { id: 'focus', label: 'Focus on Important', icon: Target },
    { id: 'reduce_time', label: 'Reduce Email Time', icon: Clock }
];

const NEVER_AUTOMATE = [
    { id: 'legal', label: 'Legal documents' },
    { id: 'hr', label: 'HR & payroll' },
    { id: 'financial', label: 'Financial transactions' },
    { id: 'security', label: 'Security alerts' }
];

export function Step4Goals({ data, updateData }: Step4Props) {
    const toggleNeverAutomate = (category: string) => {
        const current = data.never_automate_categories || [];
        if (current.includes(category)) {
            updateData({ never_automate_categories: current.filter(c => c !== category) });
        } else {
            updateData({ never_automate_categories: [...current, category] });
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center md:text-left">
                <h2 className="text-xl font-semibold tracking-tight">🎯 What are your email goals?</h2>
                <p className="text-muted-foreground">Let's set up automation that works for your specific targets.</p>
            </div>

            <div className="space-y-3">
                <Label>Primary Goal</Label>
                <div className="grid grid-cols-2 gap-3">
                    {GOALS.map((goal) => (
                        <Card
                            key={goal.id}
                            className={cn(
                                "cursor-pointer transition-all hover:bg-accent/50",
                                data.primary_goal === goal.id ? "border-primary bg-accent" : ""
                            )}
                            onClick={() => updateData({ primary_goal: goal.id as any })}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                                <goal.icon className={cn(
                                    "h-6 w-6",
                                    data.primary_goal === goal.id ? "text-primary" : "text-muted-foreground"
                                )} />
                                <span className="font-medium text-sm">{goal.label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <Label>Time Budget</Label>
                    <span className="text-sm text-muted-foreground">{data.time_budget_minutes || 30} minutes / day</span>
                </div>
                <input
                    type="range"
                    min="15"
                    max="120"
                    step="15"
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    value={data.time_budget_minutes || 30}
                    onChange={(e) => updateData({ time_budget_minutes: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>15 min</span>
                    <span>1 hour</span>
                    <span>2 hours</span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <Label>Automation Level</Label>
                    <span className="text-sm text-muted-foreground">
                        {(!data.automation_level || data.automation_level <= 3) ? 'Conservative' :
                            data.automation_level <= 7 ? 'Balanced' : 'Aggressive'}
                    </span>
                </div>
                <div className="relative pt-6">
                    <div className="absolute top-0 w-full flex justify-between text-xs font-medium text-muted-foreground px-1">
                        <span>Manual</span>
                        <span>Fully Automated</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        className="w-full h-2 bg-gradient-to-r from-blue-500/20 to-blue-500 rounded-lg appearance-none cursor-pointer accent-primary"
                        value={data.automation_level || 5}
                        onChange={(e) => updateData({ automation_level: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        {data.automation_level && data.automation_level > 7
                            ? "AI drafts and organizes aggressively. You review key items."
                            : "AI suggests drafts. You maintain full control."}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <Label>Never Automate (Safety)</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {NEVER_AUTOMATE.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2 border p-3 rounded-md bg-background">
                            <Checkbox
                                id={`safety-${item.id}`}
                                checked={data.never_automate_categories?.includes(item.id)}
                                onCheckedChange={() => toggleNeverAutomate(item.id)}
                            />
                            <Label htmlFor={`safety-${item.id}`} className="cursor-pointer">{item.label}</Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2 font-medium">
                    <BarChart3 className="h-4 w-4" />
                    Expected Results
                </div>
                <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
                    <li>Save ~2 hours per week</li>
                    <li>Respond 50% faster to clients</li>
                    <li>Zero missed important emails</li>
                </ul>
            </div>
        </div>
    );
}
