import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Assignment } from '../assignments/assignment.entity';
import { Course } from '../courses/course.entity';
import { Submission } from './submission.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { User } from '../users/user.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { TaReview } from '../teaching-assistant/ta-review.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { CourseStatus } from '../common/enums/course-status.enum';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    assignmentId: string,
    dto: CreateSubmissionDto,
    studentId: string,
    ipAddress?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const assignment = await this.lockAssignment(manager, assignmentId);
      await this.assertCanSubmit(manager, assignment, studentId);
      const repository = manager.getRepository(Submission);
      if (
        await repository.findOne({
          where: { assignment_id: assignmentId, student_id: studentId },
        })
      ) {
        throw new ConflictException(
          'You have already submitted; use the resubmission endpoint',
        );
      }
      const saved = await repository.save(
        repository.create({
          assignment_id: assignmentId,
          student_id: studentId,
          submission_url: dto.submission_url,
        }),
      );
      await this.audit(manager, 'CREATE', studentId, null, saved, ipAddress);
      return {
        message: 'Assignment submitted successfully',
        submission: this.studentView(saved),
      };
    });
  }

  async resubmit(
    id: string,
    dto: UpdateSubmissionDto,
    studentId: string,
    ipAddress?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Submission);
      const original = await repository.findOne({
        where: { id, student_id: studentId },
      });
      if (!original) throw new NotFoundException('Submission not found');
      const assignment = await this.lockAssignment(
        manager,
        original.assignment_id,
      );
      await this.assertCanSubmit(manager, assignment, studentId);
      const submission = await repository.findOne({
        where: { id, student_id: studentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!submission) throw new NotFoundException('Submission not found');
      const reviewed = await manager.count(TaReview, {
        where: { submission_id: id },
      });
      if (
        submission.graded_at ||
        submission.marks_obtained != null ||
        submission.recommended_marks != null ||
        reviewed > 0
      ) {
        throw new ConflictException(
          'Reviewed or graded submissions cannot be replaced',
        );
      }
      const before = { ...submission };
      submission.submission_url = dto.submission_url;
      submission.submitted_at = new Date();
      const saved = await repository.save(submission);
      await this.audit(manager, 'UPDATE', studentId, before, saved, ipAddress);
      return {
        message: 'Submission replaced successfully',
        submission: this.studentView(saved),
      };
    });
  }

  async getMySubmissions(studentId: string) {
    const rows = await this.dataSource.getRepository(Submission).find({
      where: { student_id: studentId },
      relations: { assignment: true },
      select: {
        id: true,
        assignment_id: true,
        student_id: true,
        submission_url: true,
        submitted_at: true,
        marks_obtained: true,
        feedback: true,
        graded_at: true,
        assignment: { id: true, title: true, max_marks: true, deadline: true },
      },
      order: { submitted_at: 'DESC' },
    });
    return rows.map((row) => this.studentView(row));
  }

  async getAssignmentSubmissions(
    assignmentId: string,
    user: { id: string; role: UserRole },
  ) {
    const assignment = await this.dataSource
      .getRepository(Assignment)
      .findOne({ where: { id: assignmentId }, relations: { course: true } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    this.assertInstructor(assignment, user, true);
    return this.dataSource.getRepository(Submission).find({
      where: { assignment_id: assignmentId },
      relations: { student: true },
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
        student: { id: true, full_name: true, email: true },
      },
      order: { submitted_at: 'ASC' },
    });
  }

  async grade(
    id: string,
    dto: GradeSubmissionDto,
    user: { id: string; role: UserRole },
    ipAddress?: string,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Submission);
      const original = await repository.findOne({ where: { id } });
      if (!original) throw new NotFoundException('Submission not found');
      const assignment = await this.lockAssignment(
        manager,
        original.assignment_id,
      );
      this.assertInstructor(assignment, user);
      if (assignment.course.status === CourseStatus.ARCHIVED)
        throw new BadRequestException('Archived courses cannot be graded');
      if (
        !Number.isFinite(dto.marks_obtained) ||
        dto.marks_obtained < 0 ||
        dto.marks_obtained > Number(assignment.max_marks)
      ) {
        throw new BadRequestException(
          'Marks must be between zero and the assignment maximum',
        );
      }
      const submission = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!submission) throw new NotFoundException('Submission not found');
      const before = { ...submission };
      submission.marks_obtained = dto.marks_obtained;
      submission.feedback = dto.feedback?.trim() || '';
      submission.graded_by_id = user.id;
      submission.graded_at = new Date();
      const saved = await repository.save(submission);
      await this.audit(manager, 'UPDATE', user.id, before, saved, ipAddress);
      return { submission: saved, assignment };
    });
    const student = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: result.submission.student_id } });
    if (student)
      await this.notificationsService.sendGradeEmail(
        student.id,
        student.email,
        result.assignment.title,
        dto.marks_obtained,
        Number(result.assignment.max_marks),
        dto.feedback,
      );
    return {
      message: 'Submission graded successfully',
      submission: result.submission,
    };
  }

  private async lockAssignment(manager: EntityManager, id: string) {
    const assignment = await manager.findOne(Assignment, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    const course = await manager.findOne(Course, {
      where: { id: assignment.course_id },
    });
    if (!course) throw new NotFoundException('Course not found');
    assignment.course = course;
    return assignment;
  }

  private async assertCanSubmit(
    manager: EntityManager,
    assignment: Assignment,
    studentId: string,
  ) {
    if (assignment.course.status !== CourseStatus.PUBLISHED)
      throw new BadRequestException('Submissions require a published course');
    if (new Date(assignment.deadline).getTime() <= Date.now())
      throw new BadRequestException(
        'The assignment submission deadline has passed',
      );
    const enrollment = await manager.findOne(Enrollment, {
      where: {
        course_id: assignment.course_id,
        student_id: studentId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]),
      },
    });
    if (!enrollment)
      throw new ForbiddenException(
        'You must be enrolled to submit this assignment',
      );
  }

  private assertInstructor(
    assignment: Assignment,
    user: { id: string; role: UserRole },
    allowAdmin = false,
  ) {
    if (allowAdmin && user.role === UserRole.ADMIN) return;
    if (
      user.role !== UserRole.INSTRUCTOR ||
      assignment.course.instructor_id !== user.id
    )
      throw new ForbiddenException('You do not own this course');
  }

  private studentView(row: Submission) {
    const {
      recommended_marks: _recommendedMarks,
      recommendation_feedback: _recommendationFeedback,
      recommended_by_id: _recommendedBy,
      recommended_at: _recommendedAt,
      ...visible
    } = row;
    return visible;
  }

  private async audit(
    manager: EntityManager,
    action: string,
    userId: string,
    before: Submission | null,
    after: Submission,
    ipAddress?: string,
  ) {
    await manager.save(
      AuditLog,
      manager.create(AuditLog, {
        user_id: userId,
        action,
        entity_type: 'SUBMISSION',
        entity_id: after.id,
        old_value: before,
        new_value: { ...after },
        ip_address: ipAddress ?? null,
      }),
    );
  }
}
