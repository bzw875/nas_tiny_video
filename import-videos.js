const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function tryLoadApiEnv() {
  const envPath = path.join(__dirname, 'packages/api/.env');
  if (!fs.existsSync(envPath) || process.env.DATABASE_URL) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (m) {
      let v = m[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env.DATABASE_URL = v;
      break;
    }
  }
}

function getDbConfig() {
  tryLoadApiEnv();
  const urlStr = process.env.DATABASE_URL;
  if (urlStr) {
    const u = new URL(urlStr.trim());
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '').split('?')[0] || 'video_manager'
    };
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'video_manager'
  };
}

async function importVideos() {
  const connection = await mysql.createConnection(getDbConfig());

  try {
    const videosData = JSON.parse(fs.readFileSync(path.join(__dirname, 'videos.json'), 'utf8'));
    const videos = videosData.videos;

    console.log(`Starting import of ${videos.length} videos...`);

    let imported = 0;
    let skipped = 0;

    for (const video of videos) {
      try {
        const createdAt = video.createdTime
          ? new Date(video.createdTime)
          : new Date();
        const updatedAt = video.modifiedTime
          ? new Date(video.modifiedTime)
          : createdAt;
        await connection.execute(
          `INSERT INTO videos (filename, path, extension, size, created_time, modified_time, video_key, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            video.filename,
            video.path,
            video.extension,
            video.size,
            new Date(video.createdTime),
            new Date(video.modifiedTime),
            video.key,
            createdAt,
            updatedAt
          ]
        );
        imported++;

        if (imported % 100 === 0) {
          console.log(`Imported ${imported}/${videos.length}...`);
        }
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          skipped++;
        } else {
          console.error(`Error importing video ${video.filename}:`, err.message);
        }
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Imported: ${imported}, Skipped (duplicates): ${skipped}`);

  } finally {
    await connection.end();
  }
}

importVideos().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
