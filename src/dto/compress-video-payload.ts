import { z } from "zod";

export const CompressVideoDto = z.object({
  format: z.enum(["mp4", "webm", "mkv", "avi"], {
    message: "The format must be either 'mp4', 'webm', 'mkv' or 'avi'.",
  }),
  width: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z
      .number({
        message: "The width must be a positive number.",
      })
      .positive({
        message: "The width must be a positive number.",
      })
      .max(
        Number(process.env.VIDEO_MAX_WIDTH || 1920),
        `The width can't be bigger than ${Number(
          process.env.VIDEO_MAX_WIDTH || 1920
        )}px.`
      ) // Maximum width
      .optional() // Make width optional
  ),
  height: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z
      .number({
        message: "The height must be a positive number.",
      })
      .positive({
        message: "The height must be a positive number.",
      })
      .max(
        Number(process.env.VIDEO_MAX_HIGHT || 1080),
        `The height can't be bigger than ${Number(
          process.env.VIDEO_MAX_HIGHT || 1080
        )}px.`
      ) // Maximum height
      .optional() // Make height optional
  ),
  bitrate: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z
      .number({
        message: "The bitrate must be a positive number.",
      })
      .positive({
        message: "The bitrate must be a positive number.",
      })
      .min(1000, "The minimum bitrate must be at least 1000 kbps.") // Minimum bitrate
      .max(25000, "The maximum bitrate must be at most 50000 kbps.") // Maximum bitrate
      .optional() // Make bitrate optional
  ),
});
