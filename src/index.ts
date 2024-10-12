import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

import { cors } from "hono/cors";

import image from "@routes/image";
import status from "@routes/status";
import video from "@routes/video";

import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";

import imageWorker from "@worker/imageCompressionWorker";
import videoWorker from "@worker/videoCompressionWorker";
import { DeleteOldCompressions } from "cron/index.cron";
import { serveStatic } from "@hono/node-server/serve-static";

const port = Number(process.env.PORT) || 3000;
const app = new Hono();

app.use(secureHeaders());
app.use("*", cors());
app.use(compress());

app.get(
  "public/:path",
  (ctx, next) => {
    ctx.header("Cache-Control", "public, max-age=86400"); // Cache for 1 day (86400 seconds)
    next();
  },
  serveStatic({
    rewriteRequestPath: (path) => path.replace(/^\/public/, "temp"),
  })
);
app.route("/status", status);
app.route("/image", image);
app.route("/video", video);

app.notFound((c) => {
  return c.json(
    {
      message: "Resource Not Found",
      statusCode: StatusCodes.NOT_FOUND,
    },
    StatusCodes.NOT_FOUND
  );
});

// workers
imageWorker.run();
videoWorker.run();

// cron
DeleteOldCompressions.start();

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running on port ${port}`);
