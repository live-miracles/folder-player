import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    root: 'renderer',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'renderer'),
        },
    },
    build: {
        outDir: '../dist/renderer',
    },
    server: {
        port: 5173,
    },
});
