import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

import { Assignment } from '../assignments/assignment.entity';
import { Submission } from './submission.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { User } from '../users/user.entity';

import { UserRole } from '../common/enums/user-role.enum';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =============================================
  // CREATE SUBMISSION
  // =============================================

  async create(
    assignmentId: string,
    dto: CreateSubmissionDto,
    studentId: string,
    ipAddress?: string,
  ) {
    const assignmentRepository =
      this.dataSource.getRepository(Assignment);

    const submissionRepository =
      this.dataSource.getRepository(Submission);

    const enrollmentRepository =
      this.dataSource.getRepository(Enrollment);

    const assignment = await assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: { course: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (new Date(assignment.deadline).getTime() < Date.now()) {
      throw new BadRequestException(
        'The assignment submission deadline has passed',
      );
    }

    const enrollment = await enrollmentRepository.findOne({
      where: {
        course_id: assignment.course_id,
        student_id: studentId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be actively enrolled to submit this assignment',
      );
    }

    const existingSubmission = await submissionRepository.findOne({
      where: {
        assignment_id: assignmentId,
        student_id: studentId,
      },
    });

    if (existingSubmission) {
      throw new ConflictException(
        'You have already submitted this assignment',
      );
    }

    const submission = submissionRepository.create({
      assignment_id: assignmentId,
      student_id: studentId,
      submission_url: dto.submission_url,
    });

    const savedSubmission =
      await submissionRepository.save(submission);

    return {
      message: 'Assignment submitted successfully',
      submission: savedSubmission,
    };
  }

  // =============================================
  // GET STUDENT SUBMISSIONS
  // =============================================

  async getMySubmissions(studentId: string) {
    const submissionRepository =
      this.dataSource.getRepository(Submission);

    return submissionRepository.find({
      where: {
        student_id: studentId,
      },
      relations: {
        assignment: true,
      },
      select: {
        id: true,
        assignment_id: true,
        student_id: true,
        submission_url: true,
        submitted_at: true,
        marks_obtained: true,
        feedback: true,
        graded_at: true,
        recommended_marks: true,
        recommendation_feedback: true,
        recommended_at: true,
        assignment: {
          id: true,
          title: true,
          max_marks: true,
          deadline: true,
        },
      },
      order: {
        submitted_at: 'DESC',
      },
    });
  }

  // =============================================
  // GET ASSIGNMENT SUBMISSIONS
  // =============================================

  async getAssignmentSubmissions(
    assignmentId: string,
    user: { id: string; role: UserRole },
  ) {
    const assignmentRepository =
      this.dataSource.getRepository(Assignment);

    const submissionRepository =
      this.dataSource.getRepository(Submission);

    const assignment = await assignmentRepository.findOne({
      where: {
        id: assignmentId,
      },
      relations: {
        course: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (
      user.role === UserRole.INSTRUCTOR &&
      assignment.course.instructor_id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot view submissions for another instructor’s course',
      );
    }

    return submissionRepository.find({
      where: {
        assignment_id: assignmentId,
      },
      relations: {
        student: true,
      },
      select: {
        id: true,
        assignment_id: true,
        student_id: true,
        submission_url: true,
        submitted_at: true,

        marks_obtained: true,
        feedback: true,
        graded_at: true,
        graded_by_id: true,

        recommended_marks: true,
        recommendation_feedback: true,
        recommended_by_id: true,
        recommended_at: true,

        student: {
          id: true,
          full_name: true,
          email: true,
        },
      },
      order: {
        submitted_at: 'ASC',
      },
    });
  }

  // =============================================
  // GRADE SUBMISSION
  // =============================================

  async grade(
    submissionId: string,
    dto: GradeSubmissionDto,
    user: { id: string; role: UserRole },
    ipAddress?: string,
  ) {
    const submissionRepository =
      this.dataSource.getRepository(Submission);

    const assignmentRepository =
      this.dataSource.getRepository(Assignment);

    const userRepository =
      this.dataSource.getRepository(User);

    const submission = await submissionRepository.findOne({
      where: {
        id: submissionId,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const assignment = await assignmentRepository.findOne({
      where: {
        id: submission.assignment_id,
      },
      relations: {
        course: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (
      user.role === UserRole.INSTRUCTOR &&
      assignment.course.instructor_id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot grade submissions for another instructor’s course',
      );
    }

    if (dto.marks_obtained > Number(assignment.max_marks)) {
      throw new BadRequestException(
        `Marks cannot exceed ${assignment.max_marks}`,
      );
    }

    submission.marks_obtained = dto.marks_obtained;
    submission.feedback = dto.feedback?.trim() || '';
    submission.graded_by_id = user.id;
    submission.graded_at = new Date();

    const savedSubmission =
      await submissionRepository.save(submission);

    const student = await userRepository.findOne({
      where: {
        id: submission.student_id,
      },
    });

    if (student) {
      await this.notificationsService.sendGradeEmail(
        student.id,
        student.email,
        assignment.title,
        dto.marks_obtained,
        Number(assignment.max_marks),
        dto.feedback,
      );
    }

    return {
      message: 'Submission graded successfully',
      submission: savedSubmission,
    };
  }
}
