// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import vercelServerless from '@astrojs/vercel/serverless';

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercelServerless({
    webAnalytics: {
      enabled: true,
    },
    // 300s = batas maksimal paket Vercel Hobby. Dibutuhkan oleh route SSE
    // (/api/projects/[id]/stream) yang menahan koneksi ~285s per siklus;
    // route biasa tetap selesai <1s jadi tidak terpengaruh.
    maxDuration: 300,
  }),
  vite: {
      plugins: [tailwindcss()],
  },

  integrations: [react()],
});