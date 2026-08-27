const fs = require('fs');
const path = require('path');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv', '.webm', '.m4v',
  '.3gp', '.ogv', '.ts', '.m2ts', '.mts', '.vob', '.f4v', '.asf',
  '.rm', '.rmvb', '.divx', '.dv', '.m2v', '.mxf', '.ogg', '.qt',
  '.yuv', '.y4m', '.h264', '.h265', '.hevc'
]);


const createkey = (size, createdTime) => {
  return `key_${size}_${createdTime}`;
}

function isVideoFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

function scanDirectory(dirPath, results = []) {
  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);

      try {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          scanDirectory(fullPath, results);
        } else if (isVideoFile(file)) {
          results.push({
            filename: file,
            path: fullPath,
            key: createkey(stats.size, stats.birthtime.toISOString()),
            extension: path.extname(file).toLowerCase(),
            size: stats.size,
            createdTime: stats.birthtime.toISOString(),
            modifiedTime: stats.mtime.toISOString()
          });
        }
      } catch (err) {
        console.error(`Error processing ${fullPath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message);
  }

  return results;
}

const targetDir = '/Volumes/banzhaowu/FormatFactory/BaiduNetdisk';

console.log(`Scanning directory: ${targetDir}`);
const videos = scanDirectory(targetDir);

console.log(`Found ${videos.length} video files`);

const output = {
  scanTime: new Date().toISOString(),
  directory: targetDir,
  totalCount: videos.length,
  videos: videos
};

const outputPath = path.join(__dirname, 'videos.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Results exported to: ${outputPath}`);
