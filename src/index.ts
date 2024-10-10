import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

import "dotenv/config";

import { cors } from "hono/cors";

import image from "@routes/image";
import video from "@routes/video";

import imageWorker from "./worker/imageCompressionWorker";

import status from "@routes/status";
import { CheckForOldCompressions } from "cron/index.cron";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";

const port = Number(process.env.PORT) || 3000;
const app = new Hono();

app.use(secureHeaders());
app.use("*", cors());
app.use(compress());

app.get("/", (c) => c.text("Welcome To Api"));
app.route("/image", image);
app.route("/video", video);
app.route("/status", status);

app.notFound((c) => {
  return c.json(
    {
      message: "Not Found",
      statusCode: 404,
    },
    StatusCodes.NOT_FOUND
  );
});

console.log(`Server is running on port ${port}`);

// workers
imageWorker.run();

// cron
CheckForOldCompressions.start();

serve({
  fetch: app.fetch,
  port,
});
