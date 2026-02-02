import { useState, useEffect } from "react";
import { UserPersona } from "../../lib/types";
import { useLanguage } from "../../context/LanguageContext";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Loader2 } from "lucide-react";
import { Step1Identity } from "./Step1Identity";
import { Step2Communication } from "./Step2Communication";
import { Step3VIPs } from "./Step3VIPs";
import { Step4Goals } from "./Step4Goals";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../context/AppContext";
import { toast } from "../Toast";

import { cn } from "../../lib/utils";

interface PersonaWizardProps {
    onComplete: () => void;
    onClose?: () => void;
    initialData?: UserPersona;
    className?: string;
}

const TOTAL_STEPS = 4;

export function PersonaWizard({ onComplete, onClose, initialData, className }: PersonaWizardProps) {
    const { t } = useLanguage();
    const { state } = useApp();
    const { user } = state;
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<UserPersona>(initialData || {
        work_style: 'startup',
        preferred_tone: 'professional',
        preferred_length: 'medium',
        primary_goal: 'inbox_zero',
        vip_senders: [],
        trusted_domains: [],
        blocked_domains: [],
        never_automate_categories: ['legal', 'hr', 'financial'],
        automation_level: 5,
        time_budget_minutes: 30
    });

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSave();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else if (onClose) {
            onClose();
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_settings')
                .update({
                    ...formData,
                    persona_completed: true,
                    persona_completed_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (error) throw error;

            toast.success("Persona saved successfully!");
            onComplete();
        } catch (error) {
            console.error('Failed to save persona:', error);
            toast.error("Failed to save persona. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateFormData = (updates: Partial<UserPersona>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Identity data={formData} updateData={updateFormData} />;
            case 2:
                return <Step2Communication data={formData} updateData={updateFormData} />;
            case 3:
                return <Step3VIPs data={formData} updateData={updateFormData} />;
            case 4:
                return <Step4Goals data={formData} updateData={updateFormData} />;
            default:
                return null;
        }
    };

    const progress = (currentStep / TOTAL_STEPS) * 100;

    return (
        <Card className={cn("w-full max-w-2xl mx-auto border-none shadow-none md:border md:shadow-lg", className)}>
            <CardHeader>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
                    {onClose && (
                        <Button variant="ghost" size="sm" onClick={onClose}>Skip</Button>
                    )}
                </div>
                <Progress value={progress} className="h-2" />
            </CardHeader>
            <CardContent className="py-4 max-h-[60vh] overflow-y-auto">
                {renderStep()}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                    {currentStep === 1 ? (onClose ? "Cancel" : "Back") : "Back"}
                </Button>
                <Button onClick={handleNext} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentStep === TOTAL_STEPS ? "Complete Setup" : "Next"}
                </Button>
            </CardFooter>
        </Card>
    );
}
