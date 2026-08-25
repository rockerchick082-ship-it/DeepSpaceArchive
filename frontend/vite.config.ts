import {
  defineConfig,
} from 'vite'

import react
  from '@vitejs/plugin-react'


export default defineConfig({

  plugins: [
    react(),
  ],

  server: {

    proxy: {

      /*
       * In local development, frontend requests such as /api/health
       * are forwarded to the normal backend dev server.
       *
       * Production nginx performs the equivalent proxy inside Docker.
       */

      '/api': {
        target:
          'http://localhost:3001',

        changeOrigin:
          true,
      },

    },

  },

})
