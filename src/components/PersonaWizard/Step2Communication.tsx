import { UserPersona } from "../../lib/types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface Step2Props {
    data: UserPersona;
    updateData: (updates: Partial<UserPersona>) => void;
}

const TONES = [
    { id: 'formal', label: 'Formal', example: 'Dear Sir/Madam, regarding...' },
    { id: 'professional', label: 'Professional', example: 'Hello, thank you for the update...' },
    { id: 'casual', label: 'Casual', example: 'Hey! Thanks for reaching out...' },
    { id: 'friendly', label: 'Friendly', example: 'Hi there! Great to hear from you...' }
];

export function Step2Communication({ data, updateData }: Step2Props) {
    const [newPhrase, setNewPhrase] = useState("");

    const addPhrase = () => {
        if (newPhrase.trim()) {
            const currentPhrases = data.common_phrases || [];
            if (!currentPhrases.includes(newPhrase.trim())) {
                updateData({ common_phrases: [...currentPhrases, newPhrase.trim()] });
            }
            setNewPhrase("");
        }
    };

    const removePhrase = (phrase: string) => {
        const currentPhrases = data.common_phrases || [];
        updateData({ common_phrases: currentPhrases.filter(p => p !== phrase) });
    };

    const getPreviewText = () => {
        const tone = data.preferred_tone || 'professional';
        const length = data.preferred_length || 'medium';
        const sig = data.signature || (data.full_name ? `Best,\n${data.full_name}` : 'Best,\n[Name]');

        let text = "";

        switch (tone) {
            case 'formal':
                text = "Dear [Recipient],\n\nI trust this email finds you well.\n\nRegarding the proposal you sent earlier, I have reviewed the attached documents.";
                break;
            case 'professional':
                text = "Hi [Recipient],\n\nThank you for sending over the proposal.\n\nI've had a chance to review the documents.";
                break;
            case 'casual':
                text = "Hey [Recipient],\n\nThanks for the proposal!\n\nJust took a look at the docs.";
                break;
            case 'friendly':
                text = "Hi [Recipient]! 👋\n\nThanks so much for sharing the proposal. Loved reading through it!";
                break;
        }

        if (length === 'brief') {
            text += "\n\nLooks good to go.";
        } else if (length === 'medium') {
            text += "\n\nOverall it looks solid, though I have a few minor questions about the timeline. Let's discuss briefly when you have a moment.";
        } else {
            text += "\n\nI've analyzed the key points and everything aligns with our objectives. Specifically, the timeline looks realistic and the budget is within scope. I do have a couple of questions regarding the implementation phase, but we can cover those in our next sync.";
        }

        text += `\n\n${sig}`;
        return text;
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center md:text-left">
                <h2 className="text-xl font-semibold tracking-tight">✍️ How do you communicate?</h2>
                <p className="text-muted-foreground">We'll adjust all drafts to match your natural style.</p>
            </div>

            <div className="space-y-3">
                <Label>Default Tone</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TONES.map((tone) => (
                        <Card
                            key={tone.id}
                            className={cn(
                                "cursor-pointer transition-all hover:bg-accent/50",
                                data.preferred_tone === tone.id ? "border-primary bg-accent" : ""
                            )}
                            onClick={() => updateData({ preferred_tone: tone.id as any })}
                        >
                            <CardContent className="p-3">
                                <p className="font-medium text-sm">{tone.label}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tone.example}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <Label>Response Length</Label>
                    <span className="text-sm text-muted-foreground capitalize">{data.preferred_length || 'medium'}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    value={data.preferred_length === 'brief' ? 1 : data.preferred_length === 'detailed' ? 3 : 2}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateData({ preferred_length: val === 1 ? 'brief' : val === 3 ? 'detailed' : 'medium' });
                    }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Brief</span>
                    <span>Medium</span>
                    <span>Detailed</span>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="signature">Signature</Label>
                <textarea
                    id="signature"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={2}
                    placeholder="Best,&#10;Trung Le"
                    value={data.signature || ''}
                    onChange={(e) => updateData({ signature: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label>Common Phrases</Label>
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g., Thanks for reaching out"
                        value={newPhrase}
                        onChange={(e) => setNewPhrase(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
                    />
                    <Button size="icon" variant="secondary" onClick={addPhrase}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {data.common_phrases?.map((phrase, i) => (
                        <div key={i} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                            {phrase}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removePhrase(phrase)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t">
                <Label className="text-muted-foreground mb-2 block">Preview: How your drafts will look</Label>
                <div className="bg-muted/30 border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                    {getPreviewText()}
                </div>
            </div>
        </div>
    );
}
