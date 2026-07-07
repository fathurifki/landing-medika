/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_IMAGE_URL: string;
  readonly VITE_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
