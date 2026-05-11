import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // 1. Define required variables
  const requiredEnvVars = ['VITE_MINIO_UPLOAD_URL'];
  const missingVars = requiredEnvVars.filter(v => !env[v]);

  console.log('\n----------------------------------------');
  
  // 2. Display warning if missing required variables
  if (missingVars.length > 0) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: Missing required environment variables:');
    missingVars.forEach(v => console.warn('\x1b[33m%s\x1b[0m', `   - ${v}`));
  } else {
    console.log('\x1b[32m%s\x1b[0m', '✓ All required environment variables are set.');
  }

  // 3. Display values (excluding sensitive data)
  console.log('\x1b[36m%s\x1b[0m', '📊 Environment Variables Loaded:');
  Object.keys(env).forEach(key => {
    // We only care about VITE_ variables for the frontend
    if (key.startsWith('VITE_')) {
      // Mask anything that looks like a password, secret, or token
      const isSensitive = /password|secret|token|key/i.test(key);
      const value = isSensitive ? '********' : env[key];
      console.log(`   ${key}: ${value}`);
    }
  });
  console.log('----------------------------------------\n');

  return {
    plugins: [react()],
    
    // Keep your existing proxy settings
    server: {
      proxy: {
        "/api": {
          target: "http://10.150.0.101:5678",
          changeOrigin: true,
          secure: false,

          rewrite: (path) => path.replace(/^\/api/, ""),
      
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log("Proxying:", req.url);
              console.log('--- proxy works ---');
              console.log('path:', proxyReq.path);
            });
          },
        },
      },
    },
  }
})