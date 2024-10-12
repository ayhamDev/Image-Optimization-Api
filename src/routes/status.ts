import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import GetJobIndexInQueue from "utils/jobInQueue";

const status = new Hono();

status.get("/:queueId", async (ctx) => {
  const { queueId } = ctx.req.param(); // Get the queueId from the URL parameter
  const db = await Initdatabase(); // Initialize the database connection
  // Fetch the job status from the database
  const jobStatus = await db.query.queueTable.findFirst({
    where: eq(queueTable.queueId, queueId),
  });

  if (!jobStatus) {
    return ctx.json(
      { message: "File status not found", statusCode: StatusCodes.NOT_FOUND },
      StatusCodes.NOT_FOUND
    );
  }
  // const InQueue = await GetJobIndexInQueue(jobStatus.queueId);

  return ctx.json({
    ...jobStatus,
    // InQueue: InQueue, // 1-based index or "N/A" if not found in waiting state
  }); // Return the status and other relevant data
});
export default status;
