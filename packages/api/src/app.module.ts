import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VideosModule } from './videos/videos.module';
import { TagsModule } from './tags/tags.module';
import { NovelsModule } from './novels/novels.module';

@Module({
  imports: [PrismaModule, VideosModule, TagsModule, NovelsModule],
})
export class AppModule {}
