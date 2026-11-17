import {
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { Type } from 'class-transformer';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({
    example: 85,
    description: 'Marks awarded to the student',
    minimum: 0,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  marks_obtained: number;

  @ApiPropertyOptional({
    example: 'Good work. Your implementation is correct.',
    description: 'Instructor feedback',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}
