const path = require('path');

const { PORT, TRACKER_PORT } = process.env;

module.exports = {
  PORT: PORT || 8081,
  TRACKER_PORT: TRACKER_PORT || 8082,
  MEDIA_FOLDER: path.join(__dirname, '..', '..', 'media'),
};
