import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgres://taskflow:taskflow@localhost:5432/taskflow_test",
      SMTP_HOST: "",
    },
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
  },
});
