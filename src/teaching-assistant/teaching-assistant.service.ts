import { Course } from '../courses/course.entity';
import { UserRole } from '../common/enums/user-role.enum';

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';

import { DataSource, Repository, EntityManager } from 'typeorm';

import { TeachingAssistantAssignment } from './teaching-assistant-assignment.entity';
import { TaReview } from './ta-review.entity';

import { Assignment } from '../assignments/assignment.entity';
import { Submission } from '../submissions/submission.entity';
import { AuditLog } from '../audit-logs/audit-log.entity';

import { RecommendSubmissionDto } from '../submissions/dto/recommend-submission.dto';

@Injectable()
export class TeachingAssistantService {
  constructor(
    @InjectRepository(TeachingAssistantAssignment)
    private readonly taAssignments: Repository<TeachingAssistantAssignment>,

    @InjectRepository(Assignment)
    private readonly assignments: Repository<Assignment>,

    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,

    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,

    @InjectRepository(TaReview)
    private readonly taReviews: Repository<TaReview>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // -----------------------------------------
  // LIST ASSIGNED COURSES
  // -----------------------------------------

  async listAssignedCourses(userId: string) {
    return this.taAssignments.find({
      where: {
        teaching_assistant_id: userId,
      },
      relations: {
        course: true,
      },
      select: {
        id: true,
        course_id: true,
        course: {
          id: true,
          title: true,
          status: true,
        },
      },
    });
  }

  // -----------------------------------------
  // LIST ASSIGNMENT SUBMISSIONS
  // -----------------------------------------

  async listSubmissions(assignmentId: string, userId: string) {
    const assignment = await this.assignments.findOne({
      where: {
        id: assignmentId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.assertAssigned(assignment.course_id, userId);

    return this.submissions.find({
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
        recommended_marks: true,
        recommendation_feedback: true,
        recommended_by_id: true,
        recommended_at: true,
        student: {
          id: true,
          full_name: true,
        },
      },
      order: {
        submitted_at: 'ASC',
      },
    });
  }

  // -----------------------------------------
  // RECOMMEND MARKS
  // -----------------------------------------

  async recommend(
    submissionId: string,
    dto: RecommendSubmissionDto,
    userId: string,
    ipAddress?: string,
  ) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const submissionRepo = manager.getRepository(Submission);

      const assignmentRepo = manager.getRepository(Assignment);

      const taAssignmentRepo = manager.getRepository(
        TeachingAssistantAssignment,
      );

      const reviewRepo = manager.getRepository(TaReview);

      const auditRepo = manager.getRepository(AuditLog);

      // 1. Lock submission.
      const submission = await submissionRepo
        .createQueryBuilder('submission')
        .setLock('pessimistic_write')
        .where('submission.id = :submissionId', {
          submissionId,
        })
        .getOne();

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      if (submission.graded_at || submission.marks_obtained != null) {
        throw new ConflictException(
          'Finalized submissions cannot receive new TA recommendations',
        );
      }

      // 2. Retrieve assignment.
      const assignment = await assignmentRepo.findOne({
        where: {
          id: submission.assignment_id,
        },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // 3. Verify TA assignment.
      const taAssignment = await taAssignmentRepo.findOne({
        where: {
          course_id: assignment.course_id,
          teaching_assistant_id: userId,
        },
      });

      if (!taAssignment) {
        throw new ForbiddenException('You are not assigned to this course');
      }

      // 4. Validate marks.
      const marks = Number(dto.marks);
      const maximumMarks = Number(assignment.max_marks);

      if (!Number.isFinite(marks) || marks < 0 || marks > maximumMarks) {
        throw new BadRequestException(
          'Recommended marks must be between 0 and the assignment maximum marks',
        );
      }

      // 5. Save permanent review history.
      const review = reviewRepo.create({
        submission_id: submission.id,
        teaching_assistant_id: userId,
        recommended_marks: marks,
        feedback: dto.feedback ?? null,
      });

      await reviewRepo.save(review);

      // 6. Update latest recommendation.
      const previousValues = {
        recommended_marks: submission.recommended_marks,
        recommendation_feedback: submission.recommendation_feedback,
        recommended_by_id: submission.recommended_by_id,
        recommended_at: submission.recommended_at,
      };

      submission.recommended_marks = marks;
      submission.recommendation_feedback = dto.feedback ?? null;
      submission.recommended_by_id = userId;
      submission.recommended_at = new Date();

      const saved = await submissionRepo.save(submission);

      // 7. Save audit record.
      const audit = auditRepo.create({
        user_id: userId,
        action: 'UPDATE',
        entity_type: 'SUBMISSION',
        entity_id: saved.id,
        old_value: previousValues,
        new_value: {
          recommended_marks: marks,
          recommendation_feedback: dto.feedback ?? null,
          recommended_by_id: userId,
          recommended_at: saved.recommended_at,
        },
        details: {
          action: 'TA_GRADE_RECOMMENDED',
          assignment_id: assignment.id,
          course_id: assignment.course_id,
          review_id: review.id,
        },
        ip_address: ipAddress ?? null,
      });

      await auditRepo.save(audit);

      return {
        message: 'Recommendation saved successfully',
        submission_id: saved.id,
        review_id: review.id,
        recommended_marks: saved.recommended_marks,
        recommendation_feedback: saved.recommendation_feedback,
        recommended_at: saved.recommended_at,
      };
    });
  }

  async getReviewHistory(
    submissionId: string,
    user: { id: string; role: UserRole },
  ) {
    const submission = await this.submissions.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const assignment = await this.assignments.findOne({
      where: { id: submission.assignment_id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (user.role === UserRole.TA) {
      await this.assertAssigned(assignment.course_id, user.id);
    } else if (user.role === UserRole.INSTRUCTOR) {
      const course = await this.dataSource
        .getRepository(Course)
        .findOne({
          where: { id: assignment.course_id, instructor_id: user.id },
        });
      if (!course) throw new ForbiddenException('You do not own this course');
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Review history is restricted to course staff',
      );
    }

    const reviews = await this.taReviews.find({
      where: { submission_id: submissionId },
      relations: {
        teaching_assistant: true,
      },
      order: {
        created_at: 'DESC',
      },
    });

    // Return only safe, necessary fields from the related user.
    return reviews.map((review) => ({
      id: review.id,
      submission_id: review.submission_id,
      teaching_assistant_id: review.teaching_assistant_id,
      teaching_assistant_name: review.teaching_assistant?.full_name ?? null,
      recommended_marks: review.recommended_marks,
      feedback: review.feedback,
      created_at: review.created_at,
    }));
  }

  // -----------------------------------------
  // VERIFY TA ASSIGNMENT
  // -----------------------------------------

  private async assertAssigned(courseId: string, userId: string) {
    const assignment = await this.taAssignments.findOne({
      where: {
        course_id: courseId,
        teaching_assistant_id: userId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this course');
    }
  }
}
