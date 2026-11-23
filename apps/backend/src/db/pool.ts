import pg from "pg";
import { config } from "../config.js";

// Colunas DATE (ex.: prazo da tarefa) voltam como texto "AAAA-MM-DD", sem conversão de fuso.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
