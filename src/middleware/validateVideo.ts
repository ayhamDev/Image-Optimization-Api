import ffmpeg from "@utils/ffmpeg";
import { Context, Next } from "hono";
import { StatusCodes } from "http-status-codes";

import { Readable } from "stream";
const VIDEO_TYPES = [
  "video/mp4",
  "ideo/webm",
  "video/x-matroska",
  "video/x-matroska",
];

const validateVideoMiddleware = async (ctx: Context, next: Next) => {
  const body = await ctx.req.parseBody();
  const file = body["file"] as File | undefined;

  if (!file)
    return ctx.json(
      { message: "Video is required.", statusCode: StatusCodes.BAD_REQUEST },
      StatusCodes.BAD_REQUEST
    );

  if (!VIDEO_TYPES.includes(file.type))
    return ctx.json(
      { error: "File must be a video." },
      StatusCodes.BAD_REQUEST
    );
  if (file.size > (Number(process.env.MAX_VIDEO_SIZE) || 24) * 1024 * 1024)
    return ctx.json(
      {
        message: "File size must be less than or equal to 24MB.",
        statusCode: StatusCodes.BAD_REQUEST,
      },
      StatusCodes.BAD_REQUEST
    );

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const videoStream = new Readable();
  videoStream._read = () => {};
  videoStream.push(fileBuffer);
  videoStream.push(null); // Mark the end of the stream
  try {
    const metadata = await new Promise<ffmpeg.FfprobeData>(
      (resolve, reject) => {
        ffmpeg(videoStream).ffprobe((err, data) => {
          if (err) {
            return reject(err); // Reject the promise if there's an error
          }
          resolve(data); // Resolve with the metadata
        });
      }
    );

    const meta = metadata.streams[0];
    if (
      meta.width &&
      meta.height &&
      (meta.width > Number(process.env.VIDEO_MAX_WIDTH || 1920) ||
        meta.height > Number(process.env.VIDEO_MAX_HEIGHT || 1080))
    ) {
      return ctx.json(
        {
          message: `Video resolution must not exceed ${
            process.env.VIDEO_MAX_WIDTH || 1920
          }x${process.env.VIDEO_MAX_HEIGHT || 1080}.`,
          statusCode: StatusCodes.BAD_REQUEST,
        },
        StatusCodes.BAD_REQUEST
      );
    }
  } catch (error) {
    return ctx.json(
      { message: "Error processing video." },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Attach the file to the context for further use
  ctx.set("video", file);

  // Proceed to the next handler if validation passes
  await next();
};
export default validateVideoMiddleware;
