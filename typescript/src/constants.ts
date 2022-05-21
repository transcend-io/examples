const path = require('path');

export const { TRANSCEND_API_KEY, SOMBRA_API_KEY, AUDIENCE } = process.env;

export const SOMBRA_URL =
  process.env.SOMBRA_URL || 'https://multi-tenant.sombra.transcend.io';

export const PORT = process.env.PORT || 8081;

export const MEDIA_FOLDER = path.join(__dirname, '..', 'media');
