import { UserPersona } from "../../lib/types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Plus, X, Star, Users, Archive, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "../ui/checkbox";

interface Step3Props {
    data: UserPersona;
    updateData: (updates: Partial<UserPersona>) => void;
}

export function Step3VIPs({ data, updateData }: Step3Props) {
    const [newVIP, setNewVIP] = useState("");
    const [newDomain, setNewDomain] = useState("");

    const addVIP = () => {
        if (newVIP.trim()) {
            const current = data.vip_senders || [];
            if (!current.includes(newVIP.trim())) {
                updateData({ vip_senders: [...current, newVIP.trim()] });
            }
            setNewVIP("");
        }
    };

    const removeVIP = (email: string) => {
        const current = data.vip_senders || [];
        updateData({ vip_senders: current.filter(e => e !== email) });
    };

    const addDomain = () => {
        if (newDomain.trim()) {
            let domain = newDomain.trim();
            if (domain.startsWith('@')) domain = domain.substring(1);

            const current = data.trusted_domains || [];
            if (!current.includes(domain)) {
                updateData({ trusted_domains: [...current, domain] });
            }
            setNewDomain("");
        }
    };

    const removeDomain = (domain: string) => {
        const current = data.trusted_domains || [];
        updateData({ trusted_domains: current.filter(d => d !== domain) });
    };

    const toggleNeverAutomate = (category: string) => {
        const current = data.never_automate_categories || [];
        if (current.includes(category)) {
            updateData({ never_automate_categories: current.filter(c => c !== category) });
        } else {
            updateData({ never_automate_categories: [...current, category] });
        }
    };

    // Low priority categories mapped to 'blocked_domains' or just skipped
    // For now we'll store them in a temporary way or update blocked_domains logic later
    const LOW_PRIORITY_OPTS = [
        { id: 'newsletters', label: 'Newsletters' },
        { id: 'social_media', label: 'Social media' },
        { id: 'marketing', label: 'Marketing emails' }
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center md:text-left">
                <h2 className="text-xl font-semibold tracking-tight">⭐ Who's important to you?</h2>
                <p className="text-muted-foreground">We'll prioritize emails from these people and domains.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* VIPs Column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <Label>VIPs (Always High Priority)</Label>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="investor@vc.com"
                            value={newVIP}
                            onChange={(e) => setNewVIP(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addVIP()}
                        />
                        <Button size="icon" variant="secondary" onClick={addVIP}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {data.vip_senders?.map((email, i) => (
                            <div key={i} className="flex items-center justify-between bg-secondary/50 p-2 rounded-md text-sm">
                                <span>{email}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVIP(email)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        {(!data.vip_senders || data.vip_senders.length === 0) && (
                            <p className="text-xs text-muted-foreground italic">No VIPs added yet</p>
                        )}
                    </div>
                </div>

                {/* Team Column */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <Label>Team & Trusted Domains</Label>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="company.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                        />
                        <Button size="icon" variant="secondary" onClick={addDomain}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {data.trusted_domains?.map((domain, i) => (
                            <div key={i} className="flex items-center justify-between bg-secondary/50 p-2 rounded-md text-sm">
                                <span>@{domain}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDomain(domain)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        {(!data.trusted_domains || data.trusted_domains.length === 0) && (
                            <p className="text-xs text-muted-foreground italic">No domains added yet</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <Label>Low Priority (Auto-Archive)</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {LOW_PRIORITY_OPTS.map(opt => (
                        // Using visual-only checkboxes for now as we don't have direct fields yet
                        // This is a placeholder for future functionality
                        <div key={opt.id} className="flex items-center space-x-2">
                            <input type="checkbox" id={opt.id} className="accent-primary h-4 w-4" defaultChecked />
                            <label htmlFor={opt.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {opt.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-500/10 text-blue-500 text-sm p-4 rounded-lg flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Tip: Adding your own company domain (@realtimex.ai) to "Team" ensures internal emails are never missed.</p>
            </div>
        </div>
    );
}
