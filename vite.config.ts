import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Build define object for all API keys (GEMINI_API_KEY_1 to GEMINI_API_KEY_20)
  const apiKeyDefines: Record<string, string> = {};
  for (let i = 1; i <= 20; i++) {
    const keyName = `GEMINI_API_KEY_${i}`;
    if (env[keyName]) {
      apiKeyDefines[`import.meta.env.${keyName}`] = JSON.stringify(env[keyName]);
    }
  }
  // Also support single key fallback
  if (env.GEMINI_API_KEY) {
    apiKeyDefines['import.meta.env.GEMINI_API_KEY'] = JSON.stringify(env.GEMINI_API_KEY);
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      ...apiKeyDefines,
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
