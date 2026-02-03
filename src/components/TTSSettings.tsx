import { useState, useEffect } from 'react';
import { Volume2, VolumeX, TestTube, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useApp } from '../context/AppContext';
import { useTTS } from '../hooks/useTTS';
import { toast } from './Toast';
import { LoadingSpinner } from './LoadingSpinner';
import { useLanguage } from '../context/LanguageContext';
import { syncTTSToLocalStorage } from '../lib/tts-sync';

interface TTSProviderConfig {
    voices?: string[];
    speed?: { min: number; max: number; default: number };
    quality?: { min: number; max: number; default: number; description?: string };
    languages?: string[];
}

interface TTSProvider {
    id: string;
    name: string;
    type: string;
    configured: boolean;
    supportsStreaming?: boolean;
    note?: string;
    config: TTSProviderConfig;
}

export function TTSSettings() {
    const { t } = useLanguage();
    const { state, actions } = useApp();
    const { speak } = useTTS();

    const [ttsProvider, setTtsProvider] = useState(state.settings?.tts_provider || 'piper_local');
    const [ttsVoice, setTtsVoice] = useState(state.settings?.tts_voice || null);
    const [ttsSpeed, setTtsSpeed] = useState(state.settings?.tts_speed || 1.0);
    const [ttsQuality, setTtsQuality] = useState(state.settings?.tts_quality || 10);
    const [ttsAutoPlay, setTtsAutoPlay] = useState(state.settings?.tts_auto_play ?? true);

    const [providers, setProviders] = useState<TTSProvider[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync state when settings change (localStorage sync handled by AppContext)
    useEffect(() => {
        if (state.settings) {
            setTtsProvider(state.settings.tts_provider || 'piper_local');
            setTtsVoice(state.settings.tts_voice || null);
            setTtsSpeed(state.settings.tts_speed || 1.0);
            setTtsQuality(state.settings.tts_quality || 10);
            setTtsAutoPlay(state.settings.tts_auto_play ?? true);
        }
    }, [state.settings]);

    // Fetch TTS providers on mount
    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            try {
                const response = await fetch('/api/tts/providers');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.providers) {
                        setProviders(data.providers);

                        // Auto-select first provider and voice if none selected
                        if (!ttsProvider && data.providers.length > 0) {
                            const firstProvider = data.providers[0];
                            setTtsProvider(firstProvider.id);

                            if (firstProvider.config?.voices?.length > 0) {
                                setTtsVoice(firstProvider.config.voices[0]);
                            }
                        }
                    }
                } else {
                    console.error('Failed to fetch TTS providers:', response.statusText);
                    toast.error('Failed to load TTS providers. Ensure RealTimeX Desktop is running.');
                }
            } catch (error) {
                console.error('Error fetching TTS providers:', error);
                toast.error('Failed to connect to TTS service');
            } finally {
                setIsLoadingProviders(false);
            }
        };
        fetchProviders();
    }, []);

    // Get available voices for selected provider
    const selectedProvider = providers.find(p => p.id === ttsProvider);
    const availableVoices = selectedProvider?.config?.voices || [];

    // Auto-select first voice when provider changes
    const handleProviderChange = (newProvider: string) => {
        setTtsProvider(newProvider);
        const provider = providers.find(p => p.id === newProvider);
        if (provider && provider.config?.voices && provider.config.voices.length > 0) {
            setTtsVoice(provider.config.voices[0]);
        } else {
            setTtsVoice(null);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            const testText = "Hello! This is a test of the text-to-speech system.";
            await speak(testText, undefined, {
                provider: ttsProvider,
                voice: ttsVoice || undefined,
                speed: ttsSpeed,
                quality: ttsQuality
            });
        } catch (error) {
            console.error('TTS test failed:', error);
            toast.error('Failed to test text-to-speech');
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await actions.updateSettings({
            tts_provider: ttsProvider,
            tts_voice: ttsVoice,
            tts_speed: ttsSpeed,
            tts_quality: ttsQuality,
            tts_auto_play: ttsAutoPlay
        } as any);

        if (success) {
            // AppContext will automatically sync to localStorage via SET_SETTINGS action
            toast.success('Voice & Speech settings saved');
        } else {
            toast.error('Failed to save settings');
        }
        setIsSaving(false);
    };

    const toggleAutoPlay = async () => {
        const next = !ttsAutoPlay;
        setTtsAutoPlay(next);

        // Save to database (AppContext will auto-sync to localStorage on success)
        const success = await actions.updateSettings({ tts_auto_play: next } as any);
        if (success) {
            if (next) {
                toast.success('Auto-speak AI responses enabled');
            } else {
                toast.info('Auto-speak AI responses disabled');
            }
        } else {
            // Revert on error
            setTtsAutoPlay(!next);
            toast.error('Failed to update setting');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-purple-500" />
                    Voice & Speech
                </CardTitle>
                <CardDescription>
                    Configure text-to-speech for AI responses
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Auto-Play Toggle */}
                <div className="flex items-center justify-between pb-4 border-b">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium">Auto-Speak AI Responses</label>
                        <p className="text-xs text-muted-foreground">
                            Automatically read AI responses aloud using text-to-speech
                        </p>
                    </div>
                    <Button
                        variant={ttsAutoPlay ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleAutoPlay}
                        className="gap-2"
                    >
                        {ttsAutoPlay ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        {ttsAutoPlay ? t('common.enabled') : t('common.disabled')}
                    </Button>
                </div>

                {/* Provider Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">TTS Provider</label>
                    {isLoadingProviders ? (
                        <div className="h-10 border rounded-md flex items-center px-3 bg-muted/20">
                            <LoadingSpinner size="sm" className="mr-2" />
                            <span className="text-xs text-muted-foreground italic">Loading providers...</span>
                        </div>
                    ) : (
                        <select
                            className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={ttsProvider}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            disabled={isLoadingProviders}
                        >
                            {providers.length === 0 && (
                                <option value="piper_local">Piper (Local)</option>
                            )}
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <p className="text-[10px] text-muted-foreground italic">
                        Select the text-to-speech provider
                    </p>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Voice</label>
                    {availableVoices.length > 0 ? (
                        <select
                            className="w-full h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={ttsVoice || ''}
                            onChange={(e) => setTtsVoice(e.target.value)}
                            disabled={isLoadingProviders}
                        >
                            {!ttsVoice && <option value="">Select a voice</option>}
                            {availableVoices.map(voice => (
                                <option key={voice} value={voice}>
                                    {voice}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="h-10 border rounded-md flex items-center px-3 bg-muted/20 text-xs text-muted-foreground">
                            {isLoadingProviders ? 'Loading...' : 'No voices available'}
                        </div>
                    )}
                    <p className="text-[10px] text-muted-foreground italic">
                        Choose the voice personality for speech synthesis
                    </p>
                </div>

                {/* Speed Slider */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Speed</label>
                        <span className="text-xs text-muted-foreground">{ttsSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={ttsSpeed}
                        onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0.5x (Slower)</span>
                        <span>2.0x (Faster)</span>
                    </div>
                </div>

                {/* Quality Slider */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Quality</label>
                        <span className="text-xs text-muted-foreground">{ttsQuality}/20</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={ttsQuality}
                        onChange={(e) => setTtsQuality(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>1 (Lower quality, faster)</span>
                        <span>20 (Higher quality, slower)</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={isTesting}
                    >
                        {isTesting ? (
                            <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                            <TestTube className="w-4 h-4 mr-2" />
                        )}
                        Test
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Save Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
