import nodemailer from "nodemailer";
import { config } from "../config.js";

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transport) {
    // Sem SMTP configurado (ex.: desenvolvimento), só registra no console.
    console.log(`[mail] para: ${to}\nassunto: ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, text });
}
