import { useState } from "react";
import { Email, EmailCategory } from "../../lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Loader2, ThumbsUp, AlertTriangle } from "lucide-react";
import { toast } from "../Toast";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";

interface FeedbackModalProps {
    email: Email;
    isOpen: boolean;
    onClose: () => void;
    defaultType?: 'analysis' | 'draft';
}

const CATEGORIES: { value: EmailCategory; label: string }[] = [
    { value: 'spam', label: 'Spam' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'personal', label: 'Personal' },
    { value: 'client', label: 'Client / Work' },
    { value: 'transactional', label: 'Receipt / Transaction' },
    { value: 'internal', label: 'Internal Team' },
    { value: 'social', label: 'Social Media' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'news', label: 'News' },
    { value: 'support', label: 'Support Ticket' },
    { value: 'other', label: 'Other' }
];

const PRIORITIES = ['High', 'Medium', 'Low'];

const DRAFT_ISSUES = [
    { id: 'tone_too_formal', label: 'Too formal' },
    { id: 'tone_too_casual', label: 'Too casual' },
    { id: 'too_long', label: 'Too long' },
    { id: 'missing_context', label: 'Missing key context' },
    { id: 'wrong_facts', label: 'Factually incorrect' },
    { id: 'bad_signature', label: 'Wrong signature' }
];

export function FeedbackModal({ email, isOpen, onClose, defaultType = 'analysis' }: FeedbackModalProps) {
    const { state } = useApp();
    const { user } = state;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Analysis Correction State
    const [category, setCategory] = useState<string>(email.category || 'other');
    const [priority, setPriority] = useState<string>((email.ai_analysis?.priority as string) || 'Medium');

    // Draft Correction State
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

    // Common State
    const [reasoning, setReasoning] = useState("");
    const [feedbackType, setFeedbackType] = useState<'analysis' | 'draft'>(defaultType);

    const toggleIssue = (id: string) => {
        if (selectedIssues.includes(id)) {
            setSelectedIssues(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIssues(prev => [...prev, id]);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setIsSubmitting(true);

        try {
            const originalData = feedbackType === 'analysis'
                ? { category: email.category, priority: email.ai_analysis?.priority }
                : { draft_content: '...timestamp...' }; // Ideally we'd capture the draft content, but for now capturing issues

            const correctedData = feedbackType === 'analysis'
                ? { category, priority }
                : { issues: selectedIssues };

            await api.submitFeedback({
                email_id: email.id,
                feedback_type: feedbackType,
                original_state: originalData,
                corrected_state: correctedData,
            });

            // Optimistic update if category changed (optional, could also be part of api.submitFeedback response handling if we moved logic there)
            if (feedbackType === 'analysis' && category !== email.category) {
                // For now directly update via supabase or api if we had a method. 
                // We'll stick to just feedback submission for learning now.
            }

            toast.success("Thanks! I'll learn from this feedback.");
            onClose();
        } catch (error) {
            console.error('Feedback error:', error);
            toast.error("Failed to submit feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ThumbsUp className="h-5 w-5 text-primary" />
                        Help Improve Intelligence
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <Button
                        variant={feedbackType === 'analysis' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFeedbackType('analysis')}
                        className="flex-1"
                    >
                        Categorization
                    </Button>
                    <Button
                        variant={feedbackType === 'draft' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFeedbackType('draft')}
                        className="flex-1"
                    >
                        Draft Quality
                    </Button>
                </div>

                <div className="space-y-4 py-2">
                    {feedbackType === 'analysis' ? (
                        <>
                            <div className="space-y-2">
                                <Label>Correct Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Correct Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITIES.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <Label>What was wrong with the draft?</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {DRAFT_ISSUES.map(issue => (
                                    <div key={issue.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleIssue(issue.id)}>
                                        <Checkbox checked={selectedIssues.includes(issue.id)} id={issue.id} />
                                        <label htmlFor={issue.id} className="text-sm cursor-pointer">{issue.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Why? (Optional context for learning)</Label>
                        <Textarea
                            placeholder="e.g. This sender is actually a client, not a newsletter..."
                            value={reasoning}
                            onChange={(e) => setReasoning(e.target.value)}
                            className="h-20"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Feedback
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
