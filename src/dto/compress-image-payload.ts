import { z } from "zod";

export const CompressImageDto = z.object({
  quality: z.preprocess(
    (value) => Number(value),
    z
      .number({ message: "The quality must be a positive number." })
      .positive({ message: "The quality must be a positive number." })
      .min(1, "the quality must be bigger than 0%")
      .max(90, { message: "The quality mustn't be bigger than 90%." })
  ),
  format: z.enum(["jpg", "png", "webp"], {
    message: "The format must be either 'jpg' or 'png` or `webp`.",
  }),
  width: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z
      .number({
        message: "The width must be a positive number.",
      })
      .positive({
        message: "The Width must be a positive number.",
      })
      .max(3840, "The width can't be bigger than 3840px")
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
      .max(2160, "The height can't be bigger than 2160px.")
      .optional() // Make height optional
  ),
});
