import Knex from "knex";
import { env } from "../utils/EnvManager.js";
import { type DatabaseTables } from "../types/DatabaseTables.js";

const DatabaseClient = Knex<DatabaseTables>({
    client: 'pg',
    connection: {
        host: env.DB_HOST,
        port: parseInt(env.DB_PORT),
        user: env.DB_USER,
        database: env.DB_NAME,
        password: env.DB_PASSWORD,
    },
});

export default DatabaseClient