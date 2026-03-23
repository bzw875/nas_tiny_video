const SMB2 = require('smb2');
import { Video } from '../entities/Video';
import { AppDataSource } from '../config/database';

export interface SmbConfig {
  share: string;
  path: string;
  domain: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface VideoFile {
  filename: string;
  path: string;
  size: number;
  modifiedAt: Date;
}

const VIDEO_EXTENSIONS = [
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp'
];

export class SmbCrawler {
  private client: any;
  private config: SmbConfig;

  constructor(config: SmbConfig) {
    this.config = config;
    this.client = new SMB2({
      share: `\\\\${config.host}\\${config.share}`,
      domain: config.domain,
      username: config.username,
      password: config.password,
      port: config.port,
    });
  }

  private isVideoFile(filename: string): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return VIDEO_EXTENSIONS.includes(ext);
  }

  private async readdir(path: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.client.readdir(path, (err: any, files: string[]) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }

  private async stat(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.stat(path, (err: any, stats: any) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });
  }

  async crawlDirectory(path: string, onVideoFound?: (video: VideoFile) => void): Promise<VideoFile[]> {
    const videos: VideoFile[] = [];

    try {
      const files = await this.readdir(path);

      for (const file of files) {
        if (file === '.' || file === '..') continue;

        const fullPath = path.endsWith('/') ? `${path}${file}` : `${path}/${file}`;

        try {
          const stats = await this.readdir(fullPath);

          // It's a directory, recurse
          const subVideos = await this.crawlDirectory(fullPath, onVideoFound);
          videos.push(...subVideos);
        } catch (dirErr) {
          try {
            // It's a file
            const stats = await this.stat(fullPath);
            if (stats.isDirectory()) {
              continue;
            }

            if (this.isVideoFile(file)) {
              const videoFile: VideoFile = {
                filename: file,
                path: fullPath,
                size: stats.size,
                modifiedAt: new Date(stats.mtime),
              };

              videos.push(videoFile);
              if (onVideoFound) {
                onVideoFound(videoFile);
              }
            }
          } catch (statErr) {
            console.error(`Error stating file ${fullPath}:`, statErr);
          }
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${path}:`, err);
    }

    return videos;
  }

  async saveToDatabase(videos: VideoFile[]): Promise<number> {
    const videoRepo = AppDataSource.getRepository(Video);
    let count = 0;

    for (const video of videos) {
      const existing = await videoRepo.findOne({ where: { path: video.path } });
      if (!existing) {
        const newVideo = videoRepo.create({
          filename: video.filename,
          path: video.path,
          size: video.size,
          modifiedAt: video.modifiedAt,
          smbHost: this.config.host,
        });
        await videoRepo.save(newVideo);
        count++;
      }
    }

    return count;
  }

  close() {
    this.client.destroy();
  }
}
