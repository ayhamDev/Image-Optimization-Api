import { serveStatic } from "@hono/node-server/serve-static";
import { zValidator } from "@hono/zod-validator";
import validateImageMiddleware from "@middleware/validateImage";
import Variables from "@variables/image";
import { Queue } from "bullmq";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { CompressImageDto } from "dto/compress-image-payload";
import { Hono } from "hono";
import { CleanPromise } from "utils/cleanPromise";
import GetJobIndexInQueue from "utils/jobInQueue";
import fs from "fs";
import path from "path";
import crypto from "crypto"; // Ensure to import crypto for generating UUIDs

const imageQueue = new Queue("image-compression", {
  defaultJobOptions: {
    attempts: 0,
  },
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT), // Cast to number
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

const image = new Hono<{ Variables: Variables }>();

image.post(
  "/compress",
  validateImageMiddleware,
  zValidator("form", CompressImageDto),
  async (ctx) => {
    const db = await Initdatabase();

    const compressImageDto = ctx.req.valid("form");
    const image = ctx.get("image");

    // Create a directory for the queue if it doesn't exist
    if (!fs.existsSync("temp")) {
      fs.mkdirSync("temp", { recursive: true });
    }

    // Generate a unique filename and save the image
    const uuid = crypto.randomUUID();
    const imagePath = path.join("temp", `${uuid}-${image.name}`);

    // Write the image file to the temp directory
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    fs.writeFileSync(imagePath, imageBuffer);

    // Add the image compression job to the queue
    const job = await imageQueue.add("image-compression", {
      imagePath, // Send the file path instead of Base64
      compressImageDto,
      id: uuid,
    });

    const compressedName = `${uuid}.${compressImageDto.format}`;

    const queueData: typeof queueTable.$inferInsert = {
      queueId: job.id,
      status: "Queued",
      compressedName: compressedName,
      originalName: image.name,
      url: ctx.req.url.replace("image/compress", `public/${compressedName}`),
    };

    await CleanPromise(db.insert(queueTable).values(queueData));
    const InQueue = await GetJobIndexInQueue("image-compression", job.id);

    return ctx.json({ ...queueData, InQueue: InQueue });
  }
);

export { imageQueue };
export default image;
