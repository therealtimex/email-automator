import { useState, useEffect } from "react";
import { Email, EmailCategory } from "../lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2, Tag } from "lucide-react";
import { toast } from "./Toast";
import { api } from "../lib/api";

interface EditCategoryModalProps {
    email: Email | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (emailId: string, updates: Partial<Email>) => void;
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

export function EditCategoryModal({ email, isOpen, onClose, onUpdate }: EditCategoryModalProps) {
    const [category, setCategory] = useState<string>('other');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (email) {
            setCategory(email.category || 'other');
        }
    }, [email]);

    const handleSubmit = async () => {
        if (!email) return;

        if (category === email.category) {
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.updateEmail(email.id, { category });
            if (res.data?.email) {
                onUpdate(email.id, { category: res.data.email.category });
                toast.success("Category updated successfully");
                onClose();
            } else {
                throw new Error(typeof res.error === 'string' ? res.error : res.error?.message || "Failed to update");
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error("Failed to update category");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary" />
                        Edit Category
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Category</Label>
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
                </div>

                <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
