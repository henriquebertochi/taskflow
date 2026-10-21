import { afterAll, beforeAll, beforeEach } from "vitest";
import { migrate } from "../src/db/migrate.js";
import { pool } from "../src/db/pool.js";

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  await pool.query("TRUNCATE users RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  await pool.end();
});
