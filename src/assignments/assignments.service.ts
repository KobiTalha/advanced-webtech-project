import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Assignment } from './entities/assignment.entity';
import { Course } from '../courses/entities/course.entity';

import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Enrollment } from '../enrollments/entities/enrollment.entity';


@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  private async findOwnedCourse(
    courseId: string,
    instructorId: string,
  ) {
    const course = await this.courseRepository.findOne({
      where: {
        id: courseId,
        instructor: { id: instructorId },
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or you do not own this course',
      );
    }

    return course;
  }

  private async findOwnedAssignment(
    assignmentId: string,
    instructorId: string,
  ) {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: assignmentId,
        course: {
          instructor: { id: instructorId },
        },
      },
      relations: {
        course: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found or you do not own its course',
      );
    }

    return assignment;
  }

  async create(
    instructorId: string,
    courseId: string,
    dto: CreateAssignmentDto,
  ) {
    const course = await this.findOwnedCourse(
      courseId,
      instructorId,
    );

    const assignment = this.assignmentRepository.create({
      title: dto.title,
      description: dto.description,
      dueDate: new Date(dto.dueDate),
      totalMarks: dto.totalMarks ?? 100,
      course,
    });

    return this.assignmentRepository.save(assignment);
  }

  async findCourseAssignments(
    courseId: string,
    instructorId: string,
  ) {
    await this.findOwnedCourse(courseId, instructorId);

    return this.assignmentRepository.find({
      where: {
        course: { id: courseId },
      },
      order: {
        dueDate: 'ASC',
      },
    });
  }

  async update(
    assignmentId: string,
    instructorId: string,
    dto: UpdateAssignmentDto,
  ) {
    const assignment = await this.findOwnedAssignment(
      assignmentId,
      instructorId,
    );

    Object.assign(assignment, {
      ...dto,
      ...(dto.dueDate
        ? { dueDate: new Date(dto.dueDate) }
        : {}),
    });

    return this.assignmentRepository.save(assignment);
  }

  async remove(
    assignmentId: string,
    instructorId: string,
  ) {
    const assignment = await this.findOwnedAssignment(
      assignmentId,
      instructorId,
    );

    await this.assignmentRepository.remove(assignment);

    return {
      message: 'Assignment deleted successfully',
    };
  }
  @InjectRepository(Enrollment)
  private readonly enrollmentRepository: Repository<Enrollment>,
 
  async findStudentCourseAssignments(
  courseId: string,
  studentId: string,
) 
{
  const enrollment = await this.enrollmentRepository.findOne({
    where: {
      student: { id: studentId },
      course: { id: courseId },
    },
  });

  if (!enrollment) {
    throw new NotFoundException(
      'Course not found or you are not enrolled',
    );
  }

  return this.assignmentRepository.find({
    where: {
      course: { id: courseId },
    },
    order: {
      dueDate: 'ASC',
    },
  });
}
}