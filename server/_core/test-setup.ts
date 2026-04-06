import { config } from "dotenv";
import path from "path";

// Load .env from project root for tests
config({ path: path.resolve(process.cwd(), ".env") });
