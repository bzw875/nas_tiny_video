import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UpdateNovelStarDto } from './dto/update-novel-star.dto';
import { NovelsService } from './novels.service';

@Controller()
export class NovelsController {
  constructor(private readonly novels: NovelsService) {}

  @Get('/novels')
  getNovels(
    @Query('page') page = 1,
    @Query('limit') limit = 1000,
  ) {
    return this.novels.getNovelsLimit(Number(page), Number(limit));
  }

  @Get('/novelByName/:name')
  async getNovelByName(@Param('name') name: string) {
    const novel = await this.novels.getNovelByName(decodeURIComponent(name));
    if (!novel) throw new NotFoundException('Novel not found');
    return novel;
  }

  @Get('/novel/:id')
  getNovel(@Param('id') id: string, @Query('page') page?: number) {
    return this.novels.getNovelPage(Number(id), page);
  }

  @Post('/novel/:id')
  updateStartRating(
    @Param('id') id: string,
    @Body() body: UpdateNovelStarDto,
  ) {
    return this.novels.updateStarRating(Number(id), body.starRating);
  }

  @Get('/scanning')
  doScanning() {
    return this.novels.doScanning();
  }

  @Delete('/novel/:id')
  async deleteNovel(@Param('id') id: string) {
    try {
      await this.novels.deleteNovel(Number(id));
      return { affected: 1, raw: [] as unknown[] };
    } catch {
      return { affected: 0, raw: [] as unknown[] };
    }
  }
}
