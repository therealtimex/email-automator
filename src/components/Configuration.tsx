import { ShieldCheck, Database, RefreshCw, Plus, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function Configuration() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Email Accounts Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Connected Accounts
                        </CardTitle>
                        <CardDescription>Manage your email providers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                    G
                                </div>
                                <div>
                                    <h4 className="font-medium">Gmail</h4>
                                    <p className="text-xs text-muted-foreground">Connected as user@gmail.com</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                Disconnect
                            </Button>
                        </div>

                        <Button className="w-full border-dashed" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Connect New Account
                        </Button>
                    </CardContent>
                </Card>

                {/* Auto-Pilot Rules Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Auto-Pilot Rules
                        </CardTitle>
                        <CardDescription>Configure AI automation behavior</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-border">
                            <div>
                                <h4 className="font-medium text-sm">Auto-Trash Spam</h4>
                                <p className="text-xs text-muted-foreground">Automatically delete emails categorized as spam</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-medium text-emerald-600">Active</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-border">
                            <div>
                                <h4 className="font-medium text-sm">Smart Drafts</h4>
                                <p className="text-xs text-muted-foreground">Generate draft replies for important emails</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-secondary border border-primary/20"></span>
                                <span className="text-xs text-muted-foreground">Paused</span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full mt-2">
                            Configure Detailed Rules
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* LLM Settings Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                        Model Configuration
                    </CardTitle>
                    <CardDescription>Configure Local LLM or API settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Model Name</label>
                            <Input placeholder="gpt-4o-mini" defaultValue="gpt-4o-mini" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Base URL</label>
                            <Input placeholder="https://api.openai.com/v1" />
                            <p className="text-[10px] text-muted-foreground">Use http://localhost:11434/v1 for Ollama</p>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button>
                            <Check className="w-4 h-4 mr-2" />
                            Save Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
