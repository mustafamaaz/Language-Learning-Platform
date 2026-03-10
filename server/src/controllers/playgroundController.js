import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");

async function readJsonFile(fileName) {
  const filePath = path.resolve(rootDir, fileName);
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents);
}

export async function getSchema(_req, res) {
  const schema = await readJsonFile("schema.json");
  res.json(schema);
}

// SEARCH: upload resources
export async function getResources(req, res) {
  const file = req.query.file === "en-en" ? "resources-en-en.json" : "resources.json";
  const resources = await readJsonFile(file);
  res.json(resources);
}
