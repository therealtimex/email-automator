import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.d.ts',
                '**/*.config.*',
            ],
        },
        testTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});
