import { IsUUID } from 'class-validator';

export class AssignTaDto {
  @IsUUID()
  teaching_assistant_id: string;

  @IsUUID()
  course_id: string;
}
