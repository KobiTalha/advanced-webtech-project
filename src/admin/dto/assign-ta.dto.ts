import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTaDto {
  @ApiProperty({
    format: 'uuid',
    description: 'An active user with the TA role',
  })
  @IsUUID()
  teaching_assistant_id: string;

  @ApiProperty({ format: 'uuid', description: 'Existing course ID' })
  @IsUUID()
  course_id: string;
}
