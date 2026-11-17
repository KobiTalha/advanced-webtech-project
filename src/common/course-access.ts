import { ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TeachingAssistantAssignment } from '../teaching-assistant/teaching-assistant-assignment.entity';

export async function assertTaAssigned(
  manager: EntityManager,
  courseId: string,
  userId: string,
) {
  const assignment = await manager.findOne(TeachingAssistantAssignment, {
    where: { course_id: courseId, teaching_assistant_id: userId },
  });
  if (!assignment)
    throw new ForbiddenException('You are not assigned to this course');
}
