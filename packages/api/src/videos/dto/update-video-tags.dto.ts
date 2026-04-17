import { IsArray, IsInt, IsOptional } from 'class-validator';

export class UpdateVideoTagsDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}
