import "dotenv/config";
import { Worker, WorkerOptions } from "bullmq";
import { Initdatabase } from "db/index.db";
import { queueTable } from "db/schema";
import { eq } from "drizzle-orm";
import { existsSync, mkdirSync } from "fs";
import sharp from "sharp";
import { CleanPromise } from "utils/cleanPromise";
import { Sleep } from "utils/sleep";
import fs from "fs/promises"; // Import fs/promises to handle file operations
import { z } from "zod";
import { CompressImageDto } from "@dto/compress-image-payload";

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
    // Sleep for 1 second
    await Sleep(1000);

    const {
      id,
      imagePath,
      compressImageDto,
    }: {
      id: string;
      imagePath: string;
      compressImageDto: z.infer<typeof CompressImageDto>;
    } = job.data; // Use imagePath instead of imageBuffer
    const imageBuffer = await fs.readFile(imagePath); // Read the image file

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

    // Ensure the temp directory exists
    if (!existsSync("temp")) {
      mkdirSync("temp", { recursive: true });
    }

    const outputFilePath = `temp/${id}.${compressImageDto.format}`;

    // Write the processed image to the specified output file
    await ImageProcess.toFile(outputFilePath);

    return { imagePath };
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

  // Get the output file path to remove it later
  const { imagePath } = job.returnvalue;

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
  await CleanPromise(fs.unlink(imagePath));
});

imageCompressionWorker.on("failed", async (job) => {
  const db = await Initdatabase();
  const { imagePath } = job?.data;

  return await CleanPromise(
    db
      .update(queueTable)
      .set({
        status: "Failed",
        completedAt: new Date(),
      })
      .where(eq(queueTable.queueId, job?.id as string))
  );
  // Handle the failed job here if necessary
  await CleanPromise(fs.unlink(imagePath));
});

export default imageCompressionWorker;
