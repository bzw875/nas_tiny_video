import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// biome-ignore lint/style/useImportType: NestJS 依赖注入需在运行时保留类引用
import { PrismaService } from '../prisma/prisma.service';
import type { QueryVideosDto, VideoSortField } from './dto/query-videos.dto';

/** 与扫描脚本、前端筛选一致的可识别视频扩展名（小写带点） */
const ALLOWED_VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.avi',
  '.mkv',
  '.mov',
  '.flv',
  '.wmv',
  '.webm',
  '.m4v',
  '.3gp',
  '.ogv',
  '.ts',
  '.m2ts',
  '.mts',
  '.vob',
  '.f4v',
  '.asf',
  '.rm',
  '.rmvb',
  '.divx',
  '.dv',
  '.m2v',
  '.mxf',
  '.ogg',
  '.qt',
  '.yuv',
  '.y4m',
  '.h264',
  '.h265',
  '.hevc',
]);

function normalizeVideoExtension(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const withDot = t.startsWith('.') ? t : `.${t}`;
  return ALLOWED_VIDEO_EXTENSIONS.has(withDot) ? withDot : null;
}

function parseExtensionsFilter(raw?: string): string[] | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const set = new Set<string>();
  for (const part of raw.split(',')) {
    const n = normalizeVideoExtension(part);
    if (n) set.add(n);
  }
  const list = [...set];
  return list.length ? list : undefined;
}

function buildOrderBy(
  sortBy?: VideoSortField,
  sortOrder?: 'asc' | 'desc',
): Prisma.VideoOrderByWithRelationInput[] {
  const order = sortOrder ?? 'desc';
  const field = sortBy ?? 'modifiedTime';

  if (field === 'tags') {
    return [{ tags: { _count: order } }, { id: order }];
  }

  const scalar = field as
    | 'id'
    | 'filename'
    | 'path'
    | 'extension'
    | 'size'
    | 'createdTime'
    | 'modifiedTime'
    | 'videoKey';

  return [{ [scalar]: order }, { id: order }];
}

function normalizeParentPrefix(prefix: string): string {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix : `${prefix}/`;
}

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTagIds(raw?: string): number[] | undefined {
    if (raw == null || raw === '') return undefined;
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n));
    return ids.length ? ids : undefined;
  }

  async findAll(q: QueryVideosDto) {
    const take = Math.min(q.take ?? 50, 200);
    const skip = q.skip ?? 0;
    const tagIds = this.parseTagIds(q.tagIds);

    const where: Prisma.VideoWhereInput = {};

    if (q.pathPrefix) {
      where.path = { startsWith: q.pathPrefix };
    }

    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { filename: { contains: s } },
        { path: { contains: s } },
      ];
    }

    if (tagIds?.length) {
      where.AND = tagIds.map((tagId) => ({
        tags: { some: { tagId } },
      }));
    }

    const extList = parseExtensionsFilter(q.extensions);
    if (extList?.length) {
      where.extension = { in: extList };
    }

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        skip,
        take,
        orderBy: buildOrderBy(q.sortBy, q.sortOrder),
        include: {
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.video.count({ where }),
    ]);

    return {
      items: items.map((v) => this.serializeVideo(v)),
      total,
      skip,
      take,
    };
  }

  async findOne(id: number) {
    const v = await this.prisma.video.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
    if (!v) throw new NotFoundException(`Video ${id} not found`);
    return this.serializeVideo(v);
  }

  async updateTags(videoId: number, tagIds: number[]) {
    await this.findOne(videoId);
    await this.prisma.$transaction([
      this.prisma.videoTag.deleteMany({ where: { videoId } }),
      ...(tagIds.length
        ? [
            this.prisma.videoTag.createMany({
              data: tagIds.map((tagId) => ({ videoId, tagId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
    return this.findOne(videoId);
  }

  async getFolderListing(parentPrefix: string) {
    const parent = normalizeParentPrefix(parentPrefix);

    const rows = await this.prisma.video.findMany({
      select: { id: true, filename: true, path: true },
    });

    const subfolders = new Map<string, number>();
    const files: { id: number; filename: string; path: string }[] = [];

    for (const row of rows) {
      if (parent) {
        if (!row.path.startsWith(parent)) continue;
        const rest = row.path.slice(parent.length);
        if (!rest) continue;
        const slash = rest.indexOf('/');
        if (slash === -1) {
          files.push(row);
        } else {
          const name = rest.slice(0, slash);
          if (name) subfolders.set(name, (subfolders.get(name) ?? 0) + 1);
        }
      } else {
        const segments = row.path.split('/').filter(Boolean);
        if (segments.length <= 1) {
          files.push(row);
        } else {
          const name = segments[0];
          subfolders.set(name, (subfolders.get(name) ?? 0) + 1);
        }
      }
    }

    return {
      parent: parentPrefix,
      subfolders: [...subfolders.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, videoCount]) => ({ name, videoCount })),
      files,
    };
  }

  private serializeVideo(v: {
    id: number;
    filename: string;
    path: string;
    extension: string | null;
    size: bigint | null;
    createdTime: Date | null;
    modifiedTime: Date | null;
    videoKey: string | null;
    tags: { tag: { id: number; name: string } }[];
  }) {
    return {
      id: v.id,
      filename: v.filename,
      path: v.path,
      extension: v.extension,
      size: v.size != null ? v.size.toString() : null,
      createdTime: v.createdTime,
      modifiedTime: v.modifiedTime,
      videoKey: v.videoKey,
      tags: v.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
    };
  }
}
