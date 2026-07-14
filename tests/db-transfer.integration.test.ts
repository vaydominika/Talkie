import { PrismaClient } from "@prisma/client";
import { createDatabaseExport, importDatabaseExport } from "@/lib/db-transfer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl=process.env.TEST_DATABASE_URL;
const suite=databaseUrl?describe:describe.skip;
suite("PostgreSQL migration and database transfer",()=>{
 let prisma:PrismaClient;
 beforeAll(()=>{prisma=new PrismaClient({datasources:{db:{url:databaseUrl}}})});
 afterAll(async()=>{await prisma.$disconnect()});
 it("round-trips all managed tables on the disposable database",async()=>{
  const marker=`transfer-${crypto.randomUUID()}@example.test`;
  await prisma.user.create({data:{email:marker,name:"Transfer check"}});
  const exported=await createDatabaseExport(prisma);
  expect(exported.tables.User?.some(row=>row.email===marker)).toBe(true);
  await importDatabaseExport(prisma,exported);
  expect(await prisma.user.findUnique({where:{email:marker}})).not.toBeNull();
 });
});
