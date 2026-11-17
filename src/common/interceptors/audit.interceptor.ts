import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { mergeMap, Observable } from 'rxjs';
import { Request } from 'express';
import { User } from '../../users/user.entity';
import { Category } from '../../categories/category.entity';
import { Course } from '../../courses/course.entity';
import { Lesson } from '../../lessons/lesson.entity';
import { Assignment } from '../../assignments/assignment.entity';
import { Submission } from '../../submissions/submission.entity';
import { Enrollment } from '../../enrollments/enrollment.entity';
import { TeachingAssistantAssignment } from '../../teaching-assistant/teaching-assistant-assignment.entity';
import { AuditLog } from '../../audit-logs/audit-log.entity';

type AuditableEntity =
  | User
  | Category
  | Course
  | Lesson
  | Assignment
  | Submission
  | Enrollment
  | TeachingAssistantAssignment;

interface RequestWithUser extends Request {
  user?: { id?: string };
}

const entityByPath: Array<[RegExp, EntityTarget<AuditableEntity>, string]> = [
  [/\/auth\/register(?:\/|$)/, User, 'USER'],
  [
    /\/admin\/teaching-assistant-assignments(?:\/|$)/,
    TeachingAssistantAssignment,
    'TEACHING_ASSISTANT_ASSIGNMENT',
  ],
  [/\/admin\/instructors(?:\/|$)/, User, 'USER'],
  [/\/users(?:\/|$)/, User, 'USER'],
  [/\/categories(?:\/|$)/, Category, 'CATEGORY'],
  [/\/courses\/[^/]+\/lessons(?:\/|$)/, Lesson, 'LESSON'],
  [/\/lessons(?:\/|$)/, Lesson, 'LESSON'],
  [/\/courses\/[^/]+\/assignments(?:\/|$)/, Assignment, 'ASSIGNMENT'],
  [
    /\/teaching-assistant\/submissions\/[^/]+\/recommendation(?:\/|$)/,
    Submission,
    'SUBMISSION',
  ],
  [/\/assignments(?:\/|$)/, Assignment, 'ASSIGNMENT'],
  [/\/courses(?:\/|$)/, Course, 'COURSE'],
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const method = request.method.toUpperCase();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const routePath = `${request.baseUrl ?? ''}${request.route?.path ?? request.path}`;
    // These workflows already write audit rows inside their database transaction.
    if (
      /\/enroll(?:\/|$)|\/assignments\/[^/]+\/submissions(?:\/|$)|\/submissions\/[^/]+(?:\/grade|\/recommendation)?$/.test(
        routePath,
      )
    ) {
      return next.handle();
    }
    const match = entityByPath.find(([pattern]) => pattern.test(routePath));
    if (!match) return next.handle();

    const [, EntityClass, entityType] = match;
    const routeParams = request.params as Record<string, string | undefined>;
    const id =
      routeParams.id ??
      routeParams.lessonId ??
      routeParams.assignmentId ??
      routeParams.submissionId ??
      (routePath.endsWith('/me') ? request.user?.id : undefined);
    const repository = this.dataSource.getRepository(EntityClass);

    return new Observable((subscriber) => {
      void (async () => {
        const oldValue = id
          ? await repository.findOne({ where: { id } as never })
          : null;

        next
          .handle()
          .pipe(
            mergeMap(async (result: unknown) => {
              const payload = this.unwrap(result) as Record<
                string,
                unknown
              > | null;
              const entityId = id ?? this.readId(payload);
              const newValue = entityId
                ? await repository.findOne({ where: { id: entityId } as never })
                : null;

              const audit = this.dataSource.getRepository(AuditLog).create({
                user_id:
                  request.user?.id ??
                  (entityType === 'USER' && method === 'POST'
                    ? entityId
                    : null),
                action: this.actionFor(method),
                entity_type: entityType,
                entity_id: entityId ?? null,
                old_value: this.safeJson(oldValue),
                new_value: newValue
                  ? this.safeJson(newValue)
                  : method === 'DELETE'
                    ? null
                    : this.safeJson(payload),
                details: { method, path: request.originalUrl },
                ip_address: request.ip ?? null,
              });
              await this.dataSource.getRepository(AuditLog).save(audit);
              return result;
            }),
          )
          .subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
          });
      })().catch((error) => subscriber.error(error));
    });
  }

  private actionFor(method: string): string {
    if (method === 'POST') return 'CREATE';
    if (method === 'DELETE') return 'DELETE';
    return 'UPDATE';
  }

  private unwrap(value: unknown): unknown {
    if (value && typeof value === 'object' && 'data' in value) {
      return (value as { data: unknown }).data;
    }
    return value;
  }

  private readId(value: Record<string, unknown> | null): string | undefined {
    if (!value) return undefined;
    if (typeof value.id === 'string') return value.id;
    for (const key of [
      'user',
      'course',
      'lesson',
      'assignment',
      'submission',
      'enrollment',
    ]) {
      const nested = value[key];
      if (nested && typeof nested === 'object') {
        const nestedId = (nested as Record<string, unknown>).id;
        if (typeof nestedId === 'string') return nestedId;
      }
    }
    for (const containerKey of [
      'data',
      'user',
      'course',
      'lesson',
      'assignment',
    ]) {
      const nestedContainer = value[containerKey];
      if (nestedContainer && typeof nestedContainer === 'object') {
        const nestedId = (nestedContainer as Record<string, unknown>).id;
        if (typeof nestedId === 'string') return nestedId;
      }
    }
    if (value.data && typeof value.data === 'object') {
      const nestedId = (value.data as Record<string, unknown>).id;
      if (typeof nestedId === 'string') return nestedId;
    }
    return undefined;
  }

  private safeJson(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object') return null;
    const redact = (input: any): any => {
      if (Array.isArray(input)) return input.map(redact);
      if (!input || typeof input !== 'object') return input;
      return Object.fromEntries(
        Object.entries(input)
          .filter(([key]) => !/(password|token|secret)/i.test(key))
          .map(([key, child]) => [key, redact(child)]),
      );
    };
    return JSON.parse(JSON.stringify(redact(value)));
  }
}
