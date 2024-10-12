import { CompressVideoDto } from "@dto/compress-video-payload";
import { zValidator } from "@hono/zod-validator";
import validateVideoMiddleware from "@middleware/validateVideo";
import { queueTable } from "@schema";
import { CleanPromise } from "@utils/cleanPromise";
import GetJobIndexInQueue from "@utils/jobInQueue";
import Variables from "@variables/video";
import { Queue } from "bullmq";
import { Initdatabase } from "db/index.db";
import fs from "fs";
import { Hono } from "hono";
import path from "path";

const videoQueue = new Queue("video-compression", {
  defaultJobOptions: {
    attempts: 0,
  },
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT), // Cast to number
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

const video = new Hono<{ Variables: Variables }>();

video.post(
  "/compress",
  validateVideoMiddleware,
  zValidator("form", CompressVideoDto),
  async (ctx) => {
    const db = await Initdatabase();

    const compressVideoDto = ctx.req.valid("form");
    const video = ctx.get("video");

    // Generate a unique filename and save the image

    if (!fs.existsSync("temp")) {
      fs.mkdirSync("temp", { recursive: true });
    }
    const uuid = crypto.randomUUID();
    const videoPath = path.join("temp", `${uuid}-${video.name}`);

    const videoBuffer = Buffer.from(await video.arrayBuffer());
    fs.writeFileSync(videoPath, videoBuffer);

    const job = await videoQueue.add("image-compression", {
      videoPath, // Send the file path instead of Base64
      compressVideoDto,
      id: uuid,
    });

    const compressedName = `${uuid}.${compressVideoDto.format}`;

    const queueData: typeof queueTable.$inferInsert = {
      queueId: job.id,
      status: "Queued",
      compressedName: compressedName,
      originalName: video.name,
      url: ctx.req.url.replace("video/compress", `public/${compressedName}`),
    };

    await CleanPromise(db.insert(queueTable).values(queueData));
    const InQueue = await GetJobIndexInQueue("video-compression", job.id);

    return ctx.json({
      ...queueData,
      InQueue,
    });
  }
);

export { videoQueue };
export default video;
