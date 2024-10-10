import { zValidator } from "@hono/zod-validator";
import validateImageMiddleware from "@middleware/validateImage";
import Variables from "@variables/image";
import { Queue } from "bullmq";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { CompressImageDto } from "dto/compress-image-payload";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

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

    const data = await db.insert(queueTable).values({
      queueId: job.id,
      fileId: uuid,
      status: "Queued",
      originalName: image.name,
      url: `http://${process.env.DOMAIN}${
        process.env.NODE_ENV !== "production" ? `:${process.env.PORT}` : ""
      }/image/${uuid}.${compressImageDto.format}`,
    });
    return ctx.json({
      queueId: job.id,
      status: "Queued",
      originalName: image.name,
      url: `http://${process.env.DOMAIN}${
        process.env.NODE_ENV !== "production" ? `:${process.env.PORT}` : ""
      }/image/${uuid}.${compressImageDto.format}`,
    });
  }
);

export default image;
