import "dotenv/config";
import { drizzle } from "drizzle-orm/connect";
import * as Schema from "@schema";

export const Initdatabase = async () =>
  await drizzle("node-postgres", {
    schema: Schema,
    connection: process.env.DATABASE_URL as string,
  });
