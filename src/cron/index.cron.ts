import { CronJob } from "cron";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { and, eq, sql } from "drizzle-orm";
import { unlink } from "fs/promises";
export const CheckForOldCompressions = new CronJob(
  "* * * * * *", // cronTime
  async function () {
    const twoHoursAgo = new Date(Date.now() - 60 * 1000); // 2 hours in milliseconds

    const db = await Initdatabase();
    const oldData = await db
      .select()
      .from(queueTable)
      .where(
        and(
          eq(queueTable.status, "Completed"),
          sql`${queueTable.createdAt} < ${twoHoursAgo}`
        )
      );
    for (let index = 0; index < oldData.length; index++) {}
  }, // onTick
  null, // onComplete
  false // start
);
