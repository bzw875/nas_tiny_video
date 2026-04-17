import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VideosModule } from './videos/videos.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [PrismaModule, VideosModule, TagsModule],
})
export class AppModule {}
