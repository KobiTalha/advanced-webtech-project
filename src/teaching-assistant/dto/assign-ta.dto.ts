import { IsUUID } from 'class-validator';

export class AssignTaDto {
  @IsUUID()
  teachingAssistantId: string;

  @IsUUID()
  courseId: string;
}