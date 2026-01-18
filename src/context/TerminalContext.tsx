import { createContext, useContext, useState, ReactNode } from 'react';

interface TerminalContextType {
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
    openTerminal: () => void;
    closeTerminal: () => void;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

export function TerminalProvider({ children }: { children: ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const openTerminal = () => setIsExpanded(true);
    const closeTerminal = () => setIsExpanded(false);

    return (
        <TerminalContext.Provider value={{ isExpanded, setIsExpanded, openTerminal, closeTerminal }}>
            {children}
        </TerminalContext.Provider>
    );
}

export function useTerminal() {
    const context = useContext(TerminalContext);
    if (!context) {
        throw new Error('useTerminal must be used within a TerminalProvider');
    }
    return context;
}
