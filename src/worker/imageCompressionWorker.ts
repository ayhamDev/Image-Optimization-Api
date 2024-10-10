import "dotenv/config";
import { Worker, WorkerOptions } from "bullmq";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { eq } from "drizzle-orm";
import { existsSync, mkdirSync } from "fs";
import sharp from "sharp";
import { CleanPromise } from "utils/cleanPromise";
import { Sleep } from "utils/sleep";

const ImageWorkerOptions: WorkerOptions = {
  autorun: false,
  concurrency: Number(process.env.IMAGE_CONCURRENCY) || 1,
  limiter: {
    duration: 1000 * 60,
    max: Number(process.env.IMAGE_COMPRESS_EVERY_MIN_LIMIT) || 10,
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

const imageCompressionWorker = new Worker(
  "image-compression",
  async (job) => {
    // sleep for 1s
    await Sleep(1000);

    const { id, imageBuffer: imageBufferBase64, compressImageDto } = job.data;
    const imageBuffer = Buffer.from(imageBufferBase64, "base64");

    const ImageProcess = sharp(imageBuffer, {
      animated: compressImageDto.format === "webp",
    });

    if (compressImageDto.width && compressImageDto.height) {
      ImageProcess.resize(compressImageDto.width, compressImageDto.height, {
        fit: "fill",
      });
    }

    if (compressImageDto.format === "jpg") {
      ImageProcess.jpeg({
        quality: compressImageDto.quality,
        mozjpeg: true,
      });
    }

    if (compressImageDto.format === "png") {
      ImageProcess.png({
        quality: 100,
        adaptiveFiltering: true,
        compressionLevel: 9,
        palette: true,
        colors: Math.floor((256 / 100) * compressImageDto.quality),
      });
    }

    if (compressImageDto.format === "webp") {
      ImageProcess.webp({
        quality: compressImageDto.quality,
        alphaQuality: compressImageDto.quality,
      });
    }
    if (!existsSync("temp")) {
      mkdirSync("temp", { recursive: true });
    }
    const outputFilePath = `temp/${id}.${compressImageDto.format}`;

    await ImageProcess.toFile(outputFilePath);

    return { outputFilePath };
  },
  {
    ...ImageWorkerOptions,
  }
);

imageCompressionWorker.on("active", async (job) => {
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
imageCompressionWorker.on("completed", async (job) => {
  const db = await Initdatabase();
  return await CleanPromise(
    db
      .update(queueTable)
      .set({
        status: "Completed",
        completedAt: new Date(),
      })
      .where(eq(queueTable.queueId, job.id as string))
  );
  // handle the completed
});
imageCompressionWorker.on("failed", async (job) => {
  const db = await Initdatabase();
  return await CleanPromise(
    db
      .update(queueTable)
      .set({
        status: "Failed",
        completedAt: new Date(),
      })
      .where(eq(queueTable.queueId, job?.id as string))
  );
  // handle the completed
});
export default imageCompressionWorker;
