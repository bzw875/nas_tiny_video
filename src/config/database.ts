import { DataSource } from 'typeorm';
import { Video } from '../entities/Video';
import { Tag } from '../entities/Tag';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'videos.db',
  synchronize: true,
  entities: [Video, Tag],
  logging: false,
});

export async function initDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('Database initialized');
  }
}
