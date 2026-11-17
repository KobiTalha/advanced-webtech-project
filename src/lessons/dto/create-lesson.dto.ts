import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(2048)
  content_url?: string;

  @IsInt()
  @IsPositive()
  sequence_number: number;
}