import { drizzle } from "drizzle-orm/libsql/sqlite3";

export const db = drizzle(process.env.DB_FILE!);
