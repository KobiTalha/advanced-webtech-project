import { IsNumber, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendSubmissionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  marks: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}
