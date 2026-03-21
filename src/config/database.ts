import { DataSource } from 'typeorm';
import { Video } from '../entities/Video';
import { Tag } from '../entities/Tag';
import { VideoTag } from '../entities/VideoTag';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'videos.db',
  synchronize: true,
  entities: [Video, Tag, VideoTag],
  logging: false,
});

export async function initDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('Database initialized');
  }
}
