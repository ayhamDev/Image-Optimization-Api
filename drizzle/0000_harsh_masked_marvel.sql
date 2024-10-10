DO $$ BEGIN
 CREATE TYPE "public"."status" AS ENUM('Queued', 'Processing', 'Completed', 'Failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"queueId" varchar(256),
	"originalName" text NOT NULL,
	"compressedName" text NOT NULL,
	"status" "status" NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"processdAt" timestamp,
	"completedAt" timestamp,
	CONSTRAINT "queue_url_unique" UNIQUE("url")
);
