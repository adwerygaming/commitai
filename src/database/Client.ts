import { JSONDriver, QuickDB } from "quick.db";
import fs from "fs";
import path from "path";
import Tags from "../utils/Tags";

const jsonDriver = new JSONDriver();

// __dirname is src/database
const databaseRootPath = path.resolve(__dirname, "../../db");
const databaseRootFolder = fs.existsSync(databaseRootPath) ? databaseRootPath : "db";

console.log(`[${Tags.System}] Database folder path: ${databaseRootFolder}`);

const DatabaseClient = new QuickDB({ driver: jsonDriver, filePath: path.join(databaseRootFolder, "memory.sqlite") });

export default DatabaseClient