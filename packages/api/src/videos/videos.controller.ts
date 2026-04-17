import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { QueryVideosDto } from './dto/query-videos.dto';
import { UpdateVideoTagsDto } from './dto/update-video-tags.dto';

@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  list(@Query() q: QueryVideosDto) {
    return this.videos.findAll(q);
  }

  @Get('folders')
  folders(@Query('parent') parent = '') {
    return this.videos.getFolderListing(parent ?? '');
  }

  @Get(':id')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.videos.findOne(id);
  }

  @Patch(':id/tags')
  patchTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateVideoTagsDto,
  ) {
    return this.videos.updateTags(id, body.tagIds ?? []);
  }
}
