import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferCourseDto {
  @ApiProperty({
    description: 'Active instructor who will own this course',
    format: 'uuid',
  })
  @IsUUID()
  instructor_id: string;
}
