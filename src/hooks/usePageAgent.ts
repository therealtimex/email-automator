import { useEffect, useRef } from 'react';
import { useAgentContext, AgentConfig } from '../context/AgentContext';

/**
 * Hook to inject page-specific context into the active Agent
 */
export function usePageAgent(config: AgentConfig) {
    const { registerAgent, resetAgent } = useAgentContext();
    const configRef = useRef(config);

    // Deep compare check or just rely on useEffect dependencies
    // Here we use a JSON stringify check to avoid infinite loops if object is recreated
    const configStr = JSON.stringify(config);

    useEffect(() => {
        registerAgent(config);

        return () => {
            // Optional: Reset to global on unmount? 
            // Or let the next page overwrite it. 
            // Resetting is safer to ensure we don't carry over stale context.
            resetAgent();
        };
    }, [configStr, registerAgent, resetAgent]);
}
