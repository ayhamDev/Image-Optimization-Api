import { zValidator } from "@hono/zod-validator";
import validateImageMiddleware from "@middleware/validateImage";
import Variables from "@variables/image";
import { Job, Queue } from "bullmq";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { CompressImageDto } from "dto/compress-image-payload";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { eq } from "drizzle-orm";
import { CleanPromise } from "utils/cleanPromise";
import GetJobIndexInQueue from "utils/jobInQueue";

const imageQueue = new Queue("image-compression", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT as unknown as number,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

const image = new Hono<{ Variables: Variables }>();

image.get(
  "/:path",
  (ctx, next) => {
    ctx.header("Cache-Control", "public, max-age=86400"); // Cache for 1 day (86400 seconds)
    next();
  },
  serveStatic({
    rewriteRequestPath: (path) => path.replace(/^\/image/, "temp"),
  })
);

image.post(
  "/compress",
  validateImageMiddleware,
  zValidator("form", CompressImageDto),
  async (ctx) => {
    const db = await Initdatabase();

    const compressImageDto = ctx.req.valid("form");
    const image = ctx.get("image");

    // Get the image as a Buffer or ArrayBuffer
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // Convert imageBuffer to Base64 string
    const imageBase64 = imageBuffer.toString("base64");

    // Add the image compression job to the queue
    const uuid = crypto.randomUUID();

    const job = await imageQueue.add("compress", {
      imageBuffer: imageBase64, // Send the Base64 encoded image
      compressImageDto,
      id: uuid,
    });
    const compressedName = `${uuid}.${compressImageDto.format}`;
    console.log();

    const queueData: typeof queueTable.$inferInsert = {
      queueId: job.id,
      status: "Queued",
      compressedName: compressedName,
      originalName: image.name,
      url: ctx.req.url.replace("compress", compressedName),
    };

    await CleanPromise(db.insert(queueTable).values(queueData));
    const InQueue = await GetJobIndexInQueue(job.id);
    return ctx.json({ ...queueData, InQueue: InQueue });
  }
);
export { imageQueue };
export default image;
