import { defineConfig, envField } from "astro/config";
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import icons from "astro-icon";
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from "vite";
import robotsTxt from "astro-robots-txt";

import fs from 'fs';
import path from 'path';


const {
    VITE_SITE_URL
} = loadEnv(process.env.NODE_ENV || "", process.cwd(), "");


// https://astro.build/config
export default defineConfig({
    site: VITE_SITE_URL,
    integrations: [tailwind(), icons(), sitemap(), react({
        include: ['**/react/*']
    }), robotsTxt()],
    compressHTML: true,
    output: 'server',
    adapter: node({
        mode: "standalone"
    }),
    vite: {
        build: {
            rollupOptions: {
                plugins: [
                    {
                        name: 'generate-robots-txt',
                        writeBundle() {
                            const robotsTxtContent = `
                            User-agent: *
                            Allow: /
                            Sitemap: ${new URL('sitemap-index.xml', VITE_SITE_URL).href}`.trim();
                            const outputPath = path.resolve(process.cwd(), 'dist/server/robots.txt');
                            fs.writeFileSync(outputPath, robotsTxtContent);
                        }
                    }
                ]
            }
        }
    }
});