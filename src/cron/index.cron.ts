import { CronJob } from "cron";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { and, eq, sql } from "drizzle-orm";
import { unlink } from "fs/promises";
import { CleanPromise } from "utils/cleanPromise";

export const CheckForOldCompressions = new CronJob(
  "*/60 * * * *", // cronTime
  async function () {
    const twoHoursAgo = new Date(Date.now() - 60 * 60 * 1000 * 2); // 2 hours in milliseconds

    const db = await Initdatabase();
    const oldData = await db
      .select()
      .from(queueTable)
      .where(
        and(
          eq(queueTable.status, "Completed"),
          sql`${queueTable.completedAt} < ${twoHoursAgo}`
        )
      );
    for (let index = 0; index < oldData.length; index++) {
      await CleanPromise(unlink(`temp/${oldData[index].compressedName}`));
    }
    await db
      .delete(queueTable)
      .where(
        and(
          eq(queueTable.status, "Completed"),
          sql`${queueTable.createdAt} < ${twoHoursAgo}`
        )
      );
  }, // sch
  null, // onComplete
  false // start
);
