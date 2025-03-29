import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: true
    },
    server: {
        port: 3000,
        open: true
    },
    test: {
        globals: true,
        environment: 'jsdom'
    }
});
