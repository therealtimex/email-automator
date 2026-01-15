import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-8 bg-background">
                    <Card className="max-w-md w-full p-8 text-center">
                        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                        <p className="text-muted-foreground mb-6">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-left bg-secondary p-3 rounded-lg mb-6 overflow-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.handleReset} variant="outline">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Refresh Page
                            </Button>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
