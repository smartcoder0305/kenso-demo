import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(rootDir, ".env") });

const port = Number(process.env.PORT || 8787);

app.listen(port, () => {
  console.log(`MT demo API http://localhost:${port}`);
  console.log(
    process.env.AI_API_KEY?.trim()
      ? `AI_API_KEY detected · model=${process.env.AI_API_MODEL || "gpt-5.2"}`
      : "WARNING: AI_API_KEY missing — set it in .env",
  );
});
