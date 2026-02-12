import { defineConfig } from 'vite';

export default defineConfig({
    // Set base to repository name for GitHub Pages
    base: '/Study/',
    build: {
        outDir: 'dist',
    }
});
