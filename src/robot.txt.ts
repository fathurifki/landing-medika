import type { APIRoute } from 'astro';
import { loadEnv } from 'vite';

const { VITE_SITE_URL } = loadEnv(
    process.env.NODE_ENV || "",
    process.cwd(),
    "",
);


const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', VITE_SITE_URL).href}
`.trim();

export const GET: APIRoute = () => {
    return new Response(robotsTxt, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
};