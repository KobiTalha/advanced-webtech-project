import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(150)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'One-time token received by email' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @IsByteLength(8, 72)
  password: string;
}
