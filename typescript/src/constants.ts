import path from 'path';

export const { TRANSCEND_API_KEY, SOMBRA_API_KEY, SOMBRA_URL, PORT } =
  process.env;

export const MEDIA_FOLDER = path.join(__dirname, 'media');
// SOMBRA_URL: SOMBRA_URL || 'https://multi-tenant.sombra.transcend.io',
// PORT: PORT || 8081,
