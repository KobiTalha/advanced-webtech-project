import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaReviews1794233421572
  implements MigrationInterface
{
  name = 'CreateTaReviews1794233421572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ta_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "teaching_assistant_id" uuid NOT NULL,
        "recommended_marks" numeric(6,2) NOT NULL,
        "feedback" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_ta_reviews"
          PRIMARY KEY ("id"),

        CONSTRAINT "CHK_ta_review_marks"
          CHECK ("recommended_marks" >= 0),

        CONSTRAINT "FK_ta_reviews_submission"
          FOREIGN KEY ("submission_id")
          REFERENCES "submissions"("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_ta_reviews_ta"
          FOREIGN KEY ("teaching_assistant_id")
          REFERENCES "users"("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ta_reviews_submission"
      ON "ta_reviews" ("submission_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ta_reviews_ta"
      ON "ta_reviews" ("teaching_assistant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_ta_reviews_ta"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_ta_reviews_submission"
    `);

    await queryRunner.query(`
      DROP TABLE "ta_reviews"
    `);
  }
}
