import { PrismaClient } from "./src/generated/prisma/client";
const prisma = new PrismaClient();
async function main() {
  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 5
  });
  console.log(JSON.stringify(logs, null, 2));
}
main();
