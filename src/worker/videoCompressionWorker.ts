import { CompressVideoDto } from "@dto/compress-video-payload";
import ffmpeg from "@utils/ffmpeg";
import { Worker, WorkerOptions } from "bullmq";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import "dotenv/config";
import { eq } from "drizzle-orm";
import fs from "fs/promises"; // Import fs/promises to handle file operations
import { CleanPromise } from "utils/cleanPromise";
import { Sleep } from "utils/sleep";
import { z } from "zod";

const VideoWorkerOptions: WorkerOptions = {
  autorun: false,
  concurrency: Number(process.env.VIDEO_CONCURRENCY) || 1,
  limiter: {
    duration: 1000 * 60,
    max: Number(process.env.VIDEO_COMPRESS_EVERY_MIN_LIMIT) || 5,
  },
  useWorkerThreads: true,
  workerThreadsOptions: {
    env: process.env,
  },
  workerForkOptions: {
    env: process.env,
  },
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT as unknown as number,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

const VideoTypesFromExt = {
  mkv: "matroska",
  mp4: "mp4",
  avi: "avi",
  webm: "webm",
};

const videoCompressionWorker = new Worker(
  "video-compression",
  async (job) => {
    // Sleep for 1 second
    await Sleep(1000);

    const {
      id,
      videoPath,
      compressVideoDto,
    }: {
      id: string;
      videoPath: string;
      compressVideoDto: z.infer<typeof CompressVideoDto>;
    } = job.data; // Use imagePath instead of imageBuffer
    const [done, error] = await CleanPromise<boolean, Error>(
      new Promise((res, rej) => {
        const videoProcess = ffmpeg()
          .input(videoPath)
          .output(`temp/${id}.${compressVideoDto.format}`)
          .format(VideoTypesFromExt[compressVideoDto.format]);
        if (compressVideoDto.width && compressVideoDto.height) {
          videoProcess
            .size(`${compressVideoDto.width}x${compressVideoDto.height}`)
            .autopad(true);
        }
        if (compressVideoDto.bitrate) {
          videoProcess.videoBitrate(compressVideoDto.bitrate);
          videoProcess.audioBitrate(128);
        }
        videoProcess
          .on("end", () => {
            res(true);
          })
          .on("error", (err) => {
            rej(err);
          })
          .run();
      })
    );

    if (error) throw new Error(error.message);

    return { videoPath };
  },
  {
    ...VideoWorkerOptions,
  }
);

videoCompressionWorker.on("active", async (job) => {
  const db = await Initdatabase();
  return await CleanPromise(
    db
      .update(queueTable)
      .set({
        status: "Processing",
        processdAt: new Date(),
      })
      .where(eq(queueTable.queueId, job.id as string))
  );
});

videoCompressionWorker.on("completed", async (job) => {
  const db = await Initdatabase();

  // Get the output file path to remove it later
  const { videoPath } = job.returnvalue;

  await CleanPromise(
    db
      .update(queueTable)
      .set({
        status: "Completed",
        completedAt: new Date(),
      })
      .where(eq(queueTable.queueId, job.id as string))
  );

  // Delete the processed image file
  await CleanPromise(fs.unlink(videoPath));
});

videoCompressionWorker.on("failed", async (job) => {
  const db = await Initdatabase();
  // Get the output file path to remove it later
  const { videoPath } = job?.data;
  await CleanPromise(
    db
      .update(queueTable)
      .set({
        status: "Failed",
        completedAt: new Date(),
      })
      .where(eq(queueTable.queueId, job?.id as string))
  );
  await CleanPromise(fs.unlink(videoPath));

  // Handle the failed job here if necessary
});

export default videoCompressionWorker;
