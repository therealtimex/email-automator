import { UserPersona } from "../../lib/types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import { Building2, Briefcase, GraduationCap, Lightbulb } from "lucide-react";

interface Step1Props {
    data: UserPersona;
    updateData: (updates: Partial<UserPersona>) => void;
}

const WORK_STYLES = [
    {
        id: 'corporate',
        label: 'Corporate',
        desc: 'Formal, structured, detailed',
        icon: Building2
    },
    {
        id: 'startup',
        label: 'Startup',
        desc: 'Fast-paced, direct, concise',
        icon: Lightbulb
    },
    {
        id: 'creative',
        label: 'Creative',
        desc: 'Flexible, casual, collaborative',
        icon: Briefcase
    },
    {
        id: 'academic',
        label: 'Academic',
        desc: 'Thorough, precise, formal',
        icon: GraduationCap
    }
];

export function Step1Identity({ data, updateData }: Step1Props) {
    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center md:text-left">
                <h2 className="text-xl font-semibold tracking-tight">👤 Tell us about yourself</h2>
                <p className="text-muted-foreground">This helps the AI understand your professional context and communication expectations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="full_name">Your Name</Label>
                    <Input
                        id="full_name"
                        placeholder="Trung Le"
                        value={data.full_name || ''}
                        onChange={(e) => updateData({ full_name: e.target.value })}
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role">Your Role</Label>
                    <Input
                        id="role"
                        placeholder="CEO / Founder"
                        value={data.role || ''}
                        onChange={(e) => updateData({ role: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                        id="company"
                        placeholder="RealTimeX"
                        value={data.company || ''}
                        onChange={(e) => updateData({ company: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <select
                        id="industry"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={data.industry || ''}
                        onChange={(e) => updateData({ industry: e.target.value })}
                    >
                        <option value="" disabled>Select an industry...</option>
                        <option value="Software & Technology">Software & Technology</option>
                        <option value="Finance & Banking">Finance & Banking</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Legal">Legal</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Work Style</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {WORK_STYLES.map((style) => (
                        <Card
                            key={style.id}
                            className={cn(
                                "cursor-pointer transition-all hover:bg-accent/50",
                                data.work_style === style.id ? "border-primary bg-accent" : ""
                            )}
                            onClick={() => updateData({ work_style: style.id as any })}
                        >
                            <CardContent className="flex items-center p-4 space-x-4">
                                <style.icon className={cn(
                                    "h-5 w-5",
                                    data.work_style === style.id ? "text-primary" : "text-muted-foreground"
                                )} />
                                <div>
                                    <p className="font-medium">{style.label}</p>
                                    <p className="text-xs text-muted-foreground">{style.desc}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="bg-blue-500/10 text-blue-500 text-sm p-4 rounded-lg flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                <p>We use this to determine how detailed or urgent your drafts should be. For example, specific "Startup" contexts will result in briefer, action-oriented emails.</p>
            </div>
        </div>
    );
}
