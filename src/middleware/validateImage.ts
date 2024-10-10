import { Context, Next } from "hono";
import { StatusCodes } from "http-status-codes";
import sharp from "sharp";
import { buffer } from "stream/consumers";

const IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

const validateImageMiddleware = async (ctx: Context, next: Next) => {
  const body = await ctx.req.parseBody();
  const file = body["file"] as File | undefined;

  if (!file)
    return ctx.json(
      { message: "Image is required.", statusCode: StatusCodes.BAD_REQUEST },
      StatusCodes.BAD_REQUEST
    );

  if (!IMAGE_TYPES.includes(file.type))
    return ctx.json(
      { error: "File must be an image." },
      StatusCodes.BAD_REQUEST
    );
  if (file.size > (Number(process.env.MAX_IMAGE_SIZE) || 5) * 1024 * 1024)
    return ctx.json(
      {
        message: "File size must be less than or equal to 5MB.",
        statusCode: StatusCodes.BAD_REQUEST,
      },
      StatusCodes.BAD_REQUEST
    );

  // Use sharp to get the image dimensions
  const imageMetadata = await sharp(await file.arrayBuffer()).metadata();

  // Check the image dimensions
  if (
    imageMetadata.width &&
    imageMetadata.height &&
    (imageMetadata.width > Number(process.env.IMAGE_MAX_WIDTH || 3840) ||
      imageMetadata.height > Number(process.env.IMAGE_MAX_HEIGHT || 2160))
  )
    return ctx.json(
      {
        message: "Image resolution must not exceed 4K (3840x2160).",
        statusCode: StatusCodes.BAD_REQUEST,
      },
      StatusCodes.BAD_REQUEST
    );

  // Attach the file to the context for further use
  ctx.set("image", file);

  // Proceed to the next handler if validation passes
  await next();
};
export default validateImageMiddleware;
