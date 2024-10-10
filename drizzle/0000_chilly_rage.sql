DO $$ BEGIN
 CREATE TYPE "public"."status" AS ENUM('Queued', 'Processing', 'Completed', 'Failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"fileId" uuid NOT NULL,
	"queueId" varchar(256),
	"originalName" text,
	"status" "status",
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "queue_fileId_unique" UNIQUE("fileId"),
	CONSTRAINT "queue_url_unique" UNIQUE("url")
);
