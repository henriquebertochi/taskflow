try {
  process.loadEnvFile();
} catch {
  // sem .env: usa apenas as variáveis do ambiente
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não definida`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required("DATABASE_URL"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 168),
  resetTokenTtlMinutes: Number(process.env.RESET_TOKEN_TTL_MINUTES ?? 60),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? "TaskFlow <nao-responda@taskflow.local>",
  },
};
