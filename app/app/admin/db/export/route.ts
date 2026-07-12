import { NextResponse } from "next/server";
import { createDatabaseExport, databaseExportFileName } from "@/lib/db-transfer";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "../../actions";

export async function GET() {
  await ensureAdmin();

  const data = await createDatabaseExport(prisma);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${databaseExportFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
