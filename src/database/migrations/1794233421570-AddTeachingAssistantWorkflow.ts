import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeachingAssistantWorkflow1794233421570 implements MigrationInterface {
  name = 'AddTeachingAssistantWorkflow1794233421570';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE IF NOT EXISTS 'TA'`);
    await queryRunner.query(`ALTER TABLE "submissions" ADD "recommended_marks" numeric(6,2)`);
    await queryRunner.query(`ALTER TABLE "submissions" ADD "recommendation_feedback" text`);
    await queryRunner.query(`ALTER TABLE "submissions" ADD "recommended_by_id" uuid`);
    await queryRunner.query(`ALTER TABLE "submissions" ADD "recommended_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_submission_recommended_by" FOREIGN KEY ("recommended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE TABLE "teaching_assistant_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teaching_assistant_id" uuid NOT NULL, "course_id" uuid NOT NULL, CONSTRAINT "UQ_ta_course" UNIQUE ("teaching_assistant_id", "course_id"), CONSTRAINT "PK_ta_assignments" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_ta_assignments_course" ON "teaching_assistant_assignments" ("course_id")`);
    await queryRunner.query(`ALTER TABLE "teaching_assistant_assignments" ADD CONSTRAINT "FK_ta_assignment_user" FOREIGN KEY ("teaching_assistant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "teaching_assistant_assignments" ADD CONSTRAINT "FK_ta_assignment_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`CREATE TABLE "lesson_progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "enrollment_id" uuid NOT NULL, "lesson_id" uuid NOT NULL, "completed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_lesson_progress_enrollment_lesson" UNIQUE ("enrollment_id", "lesson_id"), CONSTRAINT "PK_lesson_progress" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_progress_enrollment" ON "lesson_progress" ("enrollment_id")`);
    await queryRunner.query(`ALTER TABLE "lesson_progress" ADD CONSTRAINT "FK_lesson_progress_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "lesson_progress" ADD CONSTRAINT "FK_lesson_progress_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lesson_progress" DROP CONSTRAINT "FK_lesson_progress_lesson"`);
    await queryRunner.query(`ALTER TABLE "lesson_progress" DROP CONSTRAINT "FK_lesson_progress_enrollment"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_lesson_progress_enrollment"`);
    await queryRunner.query(`DROP TABLE "lesson_progress"`);
    await queryRunner.query(`ALTER TABLE "teaching_assistant_assignments" DROP CONSTRAINT "FK_ta_assignment_course"`);
    await queryRunner.query(`ALTER TABLE "teaching_assistant_assignments" DROP CONSTRAINT "FK_ta_assignment_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ta_assignments_course"`);
    await queryRunner.query(`DROP TABLE "teaching_assistant_assignments"`);
    await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_submission_recommended_by"`);
    await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "recommended_at"`);
    await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "recommended_by_id"`);
    await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "recommendation_feedback"`);
    await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "recommended_marks"`);
    // PostgreSQL does not support removing an enum value safely in place.
  }
}
