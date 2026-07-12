import { PrismaClient } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATABASE_TRANSFER_TABLES, createDatabaseExport, importDatabaseExport, parseDatabaseExport } from "@/lib/db-transfer";

loadEnvFile();

const prisma = new PrismaClient();

function loadEnvFile() {
  if (process.env.DATABASE_URL) return;

  try {
    const envPath = path.join(process.cwd(), ".env");
    const raw = require("node:fs").readFileSync(envPath, "utf8") as string;
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Prisma will report a clear error if DATABASE_URL is still missing.
  }
}

function exportPathFromArg(rawPath: string | undefined) {
  if (rawPath) return path.resolve(process.cwd(), rawPath);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), "prisma", "data-export", `talkie-db-${stamp}.json`);
}

async function exportData(outputArg: string | undefined) {
  const outputPath = exportPathFromArg(outputArg);
  const data = await createDatabaseExport(prisma);

  for (const table of DATABASE_TRANSFER_TABLES) {
    const rows = data.tables[table] ?? [];
    console.log(`Exported ${rows.length} row(s) from ${table}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`\nExport written to ${outputPath}`);
}

async function importData(inputArg: string | undefined, confirmed: boolean) {
  if (!confirmed) {
    throw new Error("Import clears destination data first. Re-run with: npm run db:import-data -- <dump.json> --confirm");
  }
  if (!inputArg) throw new Error("Missing dump path. Usage: npm run db:import-data -- <dump.json> --confirm");

  const inputPath = path.resolve(process.cwd(), inputArg);
  const parsed = parseDatabaseExport(await readFile(inputPath, "utf8"));

  console.log("Clearing destination tables...");
  await importDatabaseExport(prisma, parsed);

  for (const table of DATABASE_TRANSFER_TABLES) {
    const rows = parsed.tables[table] ?? [];
    console.log(`Imported ${rows.length} row(s) into ${table}`);
  }
}

async function main() {
  const [command, firstArg, ...rest] = process.argv.slice(2);

  if (command === "export") {
    await exportData(firstArg);
    return;
  }

  if (command === "import") {
    await importData(firstArg, rest.includes("--confirm"));
    return;
  }

  throw new Error("Usage: tsx prisma/db-transfer.ts export [dump.json] | import <dump.json> --confirm");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
