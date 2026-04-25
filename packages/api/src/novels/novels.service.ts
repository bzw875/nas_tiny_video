import { Injectable, NotFoundException } from '@nestjs/common';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Novel as NovelRow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { convertToUtf8, NOVEL_PAGE_SIZE } from './novels.utils';

const listSelect = {
  id: true,
  name: true,
  author: true,
  wordCount: true,
  starRating: true,
  readCount: true,
} as const;

const pageBaseSelect = {
  id: true,
  name: true,
  author: true,
  wordCount: true,
  starRating: true,
  readCount: true,
} as const;

export type NovelListItem = Pick<
  NovelRow,
  'id' | 'name' | 'author' | 'wordCount' | 'starRating' | 'readCount'
>;

export type NovelWithPage = NovelRow & { pageSize: number };

@Injectable()
export class NovelsService {
  constructor(private readonly prisma: PrismaService) {}

  private txtDir() {
    const raw = process.env.NOVEL_TXT_DIR ?? './txt';
    return resolve(process.cwd(), raw);
  }

  async getNovelsLimit(page: number, limit: number): Promise<NovelListItem[]> {
    return this.prisma.novel.findMany({
      select: listSelect,
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async getNovelByName(name: string): Promise<NovelRow | null> {
    return this.prisma.novel.findUnique({ where: { name } });
  }

  async getNovel(id: number): Promise<NovelRow | null> {
    return this.prisma.novel.findUnique({ where: { id } });
  }

  async getNovels(): Promise<NovelRow[]> {
    return this.prisma.novel.findMany();
  }

  async deleteNovel(id: number) {
    return this.prisma.novel.delete({ where: { id } });
  }

  /**
   * GET /novel/:id 分页正文 + 增加阅读次数（行为对齐 txtOnlineRead AppController.getNovel）
   */
  async getNovelPage(id: number, page?: number): Promise<NovelWithPage> {
    const pageNum = Math.max((page ?? 1) - 1, 0);
    const start = pageNum * NOVEL_PAGE_SIZE + 1;
    const len = NOVEL_PAGE_SIZE;

    const [novel, contentRows] = await Promise.all([
      this.prisma.novel.findUnique({
        where: { id },
        select: pageBaseSelect,
      }),
      this.prisma.$queryRaw<Array<{ content: string | null }>>`
        SELECT SUBSTRING(content, ${start}, ${len}) AS content
        FROM novel
        WHERE id = ${id}
        LIMIT 1
      `,
    ]);

    if (!novel) throw new NotFoundException('Novel not found');

    await this.prisma.novel.update({
      where: { id },
      data: { readCount: { increment: 1 } },
    });

    return {
      ...novel,
      content: contentRows[0]?.content ?? '',
      pageSize: NOVEL_PAGE_SIZE,
    };
  }

  /** POST /novel/:id — 与原文一致：用 body 中的 starRating 更新（缺省则保留原值） */
  async updateStarRating(id: number, starRating: number | undefined) {
    const cur = await this.getNovel(id);
    if (!cur) throw new NotFoundException('Novel not found');
    const next =
      starRating !== undefined && starRating !== null ? starRating : cur.starRating;
    await this.prisma.novel.update({
      where: { id },
      data: { starRating: next },
    });
    return { affected: 1, raw: [] as unknown[] };
  }

  async doScanning(): Promise<string[]> {
    const allNovels = await this.getNovels();
    const dir = this.txtDir();
    const files = await readdir(dir);
    const arr: string[] = [];

    for (const file of files) {
      const filePath = resolve(dir, file);
      if ((await stat(filePath)).isDirectory() || !file.endsWith('.txt')) {
        continue;
      }
      if (allNovels.some((item) => item.name === file)) {
        continue;
      }
      const buf = await readFile(filePath);
      const [isCover, content] = convertToUtf8(buf);
      if (isCover) {
        await writeFile(filePath, content, 'utf-8');
      }
      const author =
        content
          .slice(0, 100)
          .split('\n')
          .filter((line) => !!line)[1] ?? '';
      const name = file.replace('.text', '');
      await this.prisma.novel.create({
        data: {
          name,
          content,
          author,
          starRating: 0,
          wordCount: content.length,
          readCount: 0,
        },
      });
      arr.push(file);
    }
    return arr;
  }
}
