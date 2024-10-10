ALTER TABLE "queue" DROP CONSTRAINT "queue_fileId_unique";--> statement-breakpoint
ALTER TABLE "queue" ADD COLUMN "compressedName" text;--> statement-breakpoint
ALTER TABLE "queue" DROP COLUMN IF EXISTS "fileId";