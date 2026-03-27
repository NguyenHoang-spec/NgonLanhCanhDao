import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    const allKeys = [];
    const allKeyNames = [];
    
    // 1. Add KEY_ prefixed keys first
    for (const key in env) {
      if (key.startsWith('KEY_') && env[key]) {
        allKeys.push(env[key]);
        allKeyNames.push(key);
      }
    }

    // 2. Add GEMINI_API_KEY last
    if (env.GEMINI_API_KEY) {
      allKeys.push(env.GEMINI_API_KEY);
      allKeyNames.push('GEMINI_API_KEY');
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.ALL_KEYS': JSON.stringify(allKeys),
        'process.env.ALL_KEY_NAMES': JSON.stringify(allKeyNames),
        'process.env.VITE_USE_PROXY': JSON.stringify(env.VITE_USE_PROXY),
        'process.env.VITE_PROXY_URL': JSON.stringify(env.VITE_PROXY_URL),
        'process.env.VITE_PROXY_KEY': JSON.stringify(env.VITE_PROXY_KEY),
        'process.env.VITE_PROXY_MODEL': JSON.stringify(env.VITE_PROXY_MODEL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        exclude: ['@huggingface/transformers']
      }
    };
});
