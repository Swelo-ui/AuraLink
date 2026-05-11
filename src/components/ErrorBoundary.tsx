import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <AlertTriangle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-white font-bold text-lg mb-2">Something went wrong</h2>
                    <p className="text-aura-lavender/60 text-sm mb-6 max-w-md">
                        An unexpected error occurred. This has been logged and we'll look into it.
                    </p>
                    {this.state.error && (
                        <pre className="text-xs text-red-400/70 bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-4 max-w-md overflow-auto">
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 bg-aura-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-aura-primary/20"
                    >
                        <RefreshCw size={16} /> Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
