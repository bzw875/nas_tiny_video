import { IsNumber, IsOptional } from 'class-validator';

export class UpdateNovelStarDto {
  @IsOptional()
  @IsNumber()
  starRating?: number;
}
