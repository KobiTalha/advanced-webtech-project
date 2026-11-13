import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';

import { Transform } from 'class-transformer';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Alex Morgan',
    description: 'Updated full name',
    minLength: 2,
    maxLength: 120,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  full_name?: string;

  @ApiPropertyOptional({
    example: 'alex@example.com',
    description: 'Updated email address',
    maxLength: 150,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(150)
  email?: string;
}
