import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const VIDEO_SORT_FIELDS = [
  'id',
  'filename',
  'path',
  'extension',
  'size',
  'createdTime',
  'modifiedTime',
  'videoKey',
  'tags',
] as const;

export type VideoSortField = (typeof VIDEO_SORT_FIELDS)[number];

export class QueryVideosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;

  /** Comma-separated tag ids */
  @IsOptional()
  @IsString()
  tagIds?: string;

  @IsOptional()
  @IsString()
  pathPrefix?: string;

  @IsOptional()
  @IsString()
  search?: string;

  /** id | filename | path | extension | size | createdTime | modifiedTime | videoKey | tags */
  @IsOptional()
  @IsIn([...VIDEO_SORT_FIELDS])
  sortBy?: VideoSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  /** Comma-separated extensions, e.g. ".mp4,.mkv" */
  @IsOptional()
  @IsString()
  extensions?: string;
}
