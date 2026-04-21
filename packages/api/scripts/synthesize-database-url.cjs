'use strict';

/**
 * If DATABASE_URL is empty, build mysql URL from DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME.
 */
function synthesizeDatabaseUrl() {
  if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()) {
    return;
  }
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  if (!host || user === undefined) {
    return;
  }
  const password = process.env.DB_PASSWORD ?? '';
  const port = process.env.DB_PORT || '3306';
  const database = process.env.DB_NAME || 'video_manager';
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  process.env.DATABASE_URL = `mysql://${u}:${p}@${host}:${port}/${database}`;
}

module.exports = { synthesizeDatabaseUrl };

if (require.main === module) {
  const path = require('path');
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') throw e;
  }
  synthesizeDatabaseUrl();
}
