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
  // Produção (SERVE_FRONTEND=true): a API também entrega o build do frontend no mesmo endereço.
  // Em dev fica desligado: o Vite serve o frontend.
  serveFrontend: process.env.SERVE_FRONTEND === "true",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 168),
  resetTokenTtlMinutes: Number(process.env.RESET_TOKEN_TTL_MINUTES ?? 60),
  // Fuso usado para decidir o que é "hoje" (prazo passado, tarefa atrasada).
  timezone: process.env.APP_TIMEZONE ?? "America/Sao_Paulo",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? "TaskFlow <nao-responda@taskflow.local>",
  },
};
