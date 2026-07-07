import { defineConfig, envField } from "astro/config";
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import icons from "astro-icon";
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from "vite";
import robotsTxt from "astro-robots-txt";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { VITE_SITE_URL } = loadEnv(process.env.NODE_ENV || "development", rootDir, "");

// https://astro.build/config
export default defineConfig({
    envDir: rootDir,
    site: VITE_SITE_URL,
    integrations: [tailwind(), icons(), sitemap(), react({
        include: ['**/react/*']
    }), robotsTxt()],
    compressHTML: true,
    output: 'server',
    adapter: node({
        mode: "standalone"
    }),
    env: {
        schema: {
            VITE_API_URL: envField.string({ context: "server", access: "public", default: "http://localhost:3001/api" }),
            VITE_IMAGE_URL: envField.string({ context: "server", access: "public", default: "http://localhost:3001/files" }),
            VITE_SITE_URL: envField.string({ context: "server", access: "public", default: "" }),
        }
    },
});