-- "Curriculum" renamed to "Syllabus" everywhere. Renames in place, so every
-- existing topic, classwork link, permission setting and audit entry is kept.
ALTER TYPE "public"."curriculum_topic_status" RENAME TO "syllabus_topic_status";--> statement-breakpoint
ALTER TABLE "curriculum_topics" RENAME TO "syllabus_topics";--> statement-breakpoint
ALTER TABLE "syllabus_topics" RENAME CONSTRAINT "curriculum_topics_pkey" TO "syllabus_topics_pkey";--> statement-breakpoint
ALTER TABLE "syllabus_topics" RENAME CONSTRAINT "curriculum_topics_class_id_classes_id_fk" TO "syllabus_topics_class_id_classes_id_fk";--> statement-breakpoint
ALTER TABLE "syllabus_topics" RENAME CONSTRAINT "curriculum_topics_subject_id_subjects_id_fk" TO "syllabus_topics_subject_id_subjects_id_fk";--> statement-breakpoint
ALTER TABLE "syllabus_topics" RENAME CONSTRAINT "curriculum_topics_academic_session_id_academic_sessions_id_fk" TO "syllabus_topics_academic_session_id_academic_sessions_id_fk";--> statement-breakpoint
ALTER INDEX "curriculum_topics_class_subject_session_idx" RENAME TO "syllabus_topics_class_subject_session_idx";--> statement-breakpoint
ALTER TABLE "classwork" RENAME COLUMN "curriculum_topic_id" TO "syllabus_topic_id";--> statement-breakpoint
ALTER TABLE "classwork" RENAME CONSTRAINT "classwork_curriculum_topic_id_curriculum_topics_id_fk" TO "classwork_syllabus_topic_id_syllabus_topics_id_fk";--> statement-breakpoint
-- Postgres 18+ also names each NOT NULL constraint after the table (e.g.
-- "curriculum_topics_title_not_null"); older versions have none. Rename
-- whatever is left, so this works on either.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint WHERE conname LIKE '%curriculum%' LOOP
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', c.tbl, c.conname, replace(c.conname, 'curriculum', 'syllabus'));
  END LOOP;
END $$;--> statement-breakpoint
-- Data that stores the old names as plain text.
UPDATE "role_permissions" SET "module" = 'syllabus' WHERE "module" = 'curriculum';--> statement-breakpoint
UPDATE "role_permissions" SET "module" = 'syllabusManage' WHERE "module" = 'curriculumManage';--> statement-breakpoint
UPDATE "audit_logs" SET "action" = replace("action", 'curriculum_topic.', 'syllabus_topic.') WHERE "action" LIKE 'curriculum_topic.%';--> statement-breakpoint
UPDATE "audit_logs" SET "entity" = 'SyllabusTopic' WHERE "entity" = 'CurriculumTopic';--> statement-breakpoint
UPDATE "attachments" SET "module" = 'syllabus' WHERE "module" = 'curriculum';
