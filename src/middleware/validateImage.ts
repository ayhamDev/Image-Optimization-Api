import { Context, Next } from "hono";
import { StatusCodes } from "http-status-codes";

const IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

const validateImageMiddleware = async (c: Context, next: Next) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;

  if (!file)
    return c.json({ error: "Image is required." }, StatusCodes.BAD_REQUEST);

  if (!IMAGE_TYPES.includes(file.type))
    return c.json({ error: "File must be an image." }, StatusCodes.BAD_REQUEST);

  // Attach the file to the context for further use
  c.set("image", file);

  // Proceed to the next handler if validation passes
  await next();
};
export default validateImageMiddleware;
