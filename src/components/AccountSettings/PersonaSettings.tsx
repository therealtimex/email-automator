import { useState } from 'react';
import { UserPersona } from '../../lib/types';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit2, User, Globe, MessageSquare, Target, CheckCircle } from 'lucide-react';
import { PersonaWizard } from '../PersonaWizard/PersonaWizard';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';

export function PersonaSettings() {
    const { t } = useLanguage();
    const { state, actions } = useApp();
    const [isEditing, setIsEditing] = useState(false);

    // Fallback to empty object if settings/persona is null
    const persona: UserPersona = state.settings || {
        persona_completed: false
    };

    const handleEditComplete = async () => {
        setIsEditing(false);
        await actions.fetchSettings(); // Refresh data
    };

    if (isEditing) {
        return (
            <Dialog open={true} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-3xl">
                    <DialogTitle>{t('persona.edit.title') || 'Edit Persona'}</DialogTitle>
                    <DialogDescription>{t('persona.edit.desc') || 'Update your digital assistant preferences.'}</DialogDescription>
                    <PersonaWizard
                        initialData={persona}
                        onComplete={handleEditComplete}
                        onClose={() => setIsEditing(false)}
                    />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">{t('persona.title') || 'Digital Persona'}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t('persona.subtitle') || 'Manage how your AI assistant represents you.'}
                    </p>
                </div>
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    {t('common.edit') || 'Edit Persona'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identity Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            <CardTitle className="text-base">{t('persona.identity') || 'Identity'}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-muted-foreground">Role:</span>
                            <span className="font-medium text-right">{persona.role || 'Not set'}</span>

                            <span className="text-muted-foreground">Industry:</span>
                            <span className="font-medium text-right">{persona.industry || 'Not set'}</span>

                            <span className="text-muted-foreground">Style:</span>
                            <span className="font-medium capitalize text-right">{persona.work_style || 'Not set'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Communication Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-base">{t('persona.communication') || 'Communication'}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-muted-foreground">Tone:</span>
                            <span className="font-medium capitalize text-right">{persona.preferred_tone || 'Professional'}</span>

                            <span className="text-muted-foreground">Length:</span>
                            <span className="font-medium capitalize text-right">{persona.preferred_length || 'Medium'}</span>

                            <span className="text-muted-foreground">Languages:</span>
                            <div className="flex justify-end gap-1 flex-wrap">
                                {(persona.common_phrases?.length || 0) > 0 ? (
                                    <Badge variant="secondary" className="text-xs">Custom Phrases Active</Badge>
                                ) : (
                                    <span className="text-muted-foreground italic">None</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Automation Goals */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-emerald-500" />
                            <CardTitle className="text-base">{t('persona.automation') || 'Automation'}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-muted-foreground">Primary Goal:</span>
                            <span className="font-medium capitalize text-right">
                                {persona.primary_goal?.replace('_', ' ') || 'Inbox Zero'}
                            </span>

                            <span className="text-muted-foreground">Auto Level:</span>
                            <div className="flex items-center justify-end gap-2">
                                <span className="font-medium">{persona.automation_level || 5}/10</span>
                            </div>
                        </div>

                        {(persona.never_automate_categories?.length || 0) > 0 && (
                            <div className="pt-2">
                                <span className="text-xs text-muted-foreground block mb-1">Never Automate:</span>
                                <div className="flex flex-wrap gap-1">
                                    {persona.never_automate_categories?.map(cat => (
                                        <Badge key={cat} variant="outline" className="text-xs py-0 h-5 bg-background">{cat}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Network / VIPs */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-sky-500" />
                            <CardTitle className="text-base">{t('persona.network') || 'Network'}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <span className="text-xs text-muted-foreground block mb-2">VIP Senders ({persona.vip_senders?.length || 0})</span>
                            <div className="flex flex-wrap gap-1 max-h-[60px] overflow-hidden">
                                {persona.vip_senders?.slice(0, 3).map(vip => (
                                    <Badge key={vip} variant="secondary" className="text-xs py-0 h-5 truncate max-w-[150px]">{vip}</Badge>
                                ))}
                                {(persona.vip_senders?.length || 0) > 3 && (
                                    <span className="text-xs text-muted-foreground flex items-center">+{persona.vip_senders!.length - 3} more</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 border-t mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Trusted Domains:</span>
                                <span className="font-medium">{persona.trusted_domains?.length || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
