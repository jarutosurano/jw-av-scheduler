import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { scheduleApiPlugin } from './src/plugins/schedule-api';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  site: 'https://jarutosurano.github.io',
  base: '/jw-av-scheduler',
  vite: {
    plugins: [scheduleApiPlugin()],
  },
});
