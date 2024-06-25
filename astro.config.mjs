import { defineConfig } from "astro/config";
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import icons from "astro-icon";
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    site: "http://landing-medika.pomerain.org/",
    integrations: [tailwind(), icons(), react({
        include: ['**/react/*']
    })],
    compressHTML: true,
    output: 'server',
    adapter: node({
        mode: "standalone"
    }),
    vite: {
        define: {
            'process.env.PUBLIC_API': JSON.stringify(process.env.PUBLIC_API)
        }
    }
}); 