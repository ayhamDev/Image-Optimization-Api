import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

import { cors } from "hono/cors";

import image from "@routes/image";
import video from "@routes/video";
import status from "@routes/status";

import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";

import { CheckForOldCompressions } from "cron/index.cron";
import imageWorker from "@worker/imageCompressionWorker";

const port = Number(process.env.PORT) || 3000;
const app = new Hono();

app.use(secureHeaders());
app.use("*", cors());
app.use(compress());

app.route("/status", status);
app.route("/image", image);
app.route("/video", video);

app.notFound((c) => {
  return c.json(
    {
      message: "The Requested Endpoint Was Not Found",
      statusCode: StatusCodes.NOT_FOUND,
    },
    StatusCodes.NOT_FOUND
  );
});

// workers
imageWorker.run();

// cron
CheckForOldCompressions.start();

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on port ${port}`);
