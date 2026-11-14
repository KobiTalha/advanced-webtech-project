import { Injectable 
    NotFoundException
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TeachingAssistantCourse } from './entities/teaching-assistant-course.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Submission } from '../submissions/entities/submission.entity';

@Injectable()
export class TeachingAssistantService {
  constructor(
    @InjectRepository(TeachingAssistantCourse)
    private readonly taCourseRepository: Repository<TeachingAssistantCourse>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,

    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
  ) {}

  private async verifyCourseAccess(
    courseId: string,
    teachingAssistantId: string,
  ) {
    const assignment = await this.taCourseRepository.findOne({
      where: {
        teachingAssistant: { id: teachingAssistantId },
        course: { id: courseId },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Course not found or you are not assigned to it',
      );
    }

    return assignment;
  }

  async getMyCourses(teachingAssistantId: string) {
    const assignments = await this.taCourseRepository.find({
      where: {
        teachingAssistant: { id: teachingAssistantId },
      },
      relations: {
        course: {
          category: true,
          instructor: true,
        },
      },
      order: {
        assignedAt: 'DESC',
      },
    });

    return assignments.map((assignment) => ({
      assignedAt: assignment.assignedAt,
      course: assignment.course,
    }));
  }

  async getCourseLessons(
    courseId: string,
    teachingAssistantId: string,
  ) {
    await this.verifyCourseAccess(
      courseId,
      teachingAssistantId,
    );

    return this.lessonRepository.find({
      where: {
        course: { id: courseId },
      },
      order: {
        position: 'ASC',
      },
    });
  }

  async getCourseAssignments(
    courseId: string,
    teachingAssistantId: string,
  ) {
    await this.verifyCourseAccess(
      courseId,
      teachingAssistantId,
    );

    return this.assignmentRepository.find({
      where: {
        course: { id: courseId },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getAssignmentSubmissions(
    assignmentId: string,
    teachingAssistantId: string,
  ) {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: assignmentId,
        course: {
          teachingAssistantAssignments: {
            teachingAssistant: {
              id: teachingAssistantId,
            },
          },
        },
      } as any,
    });

    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found or you are not assigned to its course',
      );
    }

    return this.submissionRepository.find({
      where: {
        assignment: { id: assignmentId },
      },
      relations: {
        student: true,
      },
      select: {
        id: true,
        content: true,
        fileUrl: true,
        marksObtained: true,
        feedback: true,
        gradedAt: true,
        submittedAt: true,
        student: {
          id: true,
          name: true,
          email: true,
        },
      },
      order: {
        submittedAt: 'DESC',
      },
    });
  }
}