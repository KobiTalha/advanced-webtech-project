import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ type: Boolean, description: 'Whether the account is active' })
  @IsBoolean()
  is_active: boolean;
}
