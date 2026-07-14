import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("social concurrency on PostgreSQL", () => {
  let prisma: PrismaClient;
  const userIds: string[] = [];

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  });

  afterAll(async () => {
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  async function users() {
    const marker = crypto.randomUUID();
    const [a, b] = await Promise.all([
      prisma.user.create({ data: { email: `race-a-${marker}@example.test` } }),
      prisma.user.create({ data: { email: `race-b-${marker}@example.test` } }),
    ]);
    userIds.push(a.id, b.id);
    return [a, b] as const;
  }

  function expectSingleWinner(results: PromiseSettledResult<unknown>[]) {
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  }

  it("allows only one crossed friend request per canonical pair", async () => {
    const [a, b] = await users();
    const pairKey = [a.id, b.id].sort().join(":");
    const results = await Promise.allSettled([
      prisma.friendRequest.create({ data: { senderId: a.id, recipientId: b.id, pairKey } }),
      prisma.friendRequest.create({ data: { senderId: b.id, recipientId: a.id, pairKey } }),
    ]);
    expectSingleWinner(results);
    expect(await prisma.friendRequest.count({ where: { pairKey } })).toBe(1);
  });

  it("deduplicates same-day nudges under simultaneous requests", async () => {
    const [a, b] = await users();
    const data = { senderId: a.id, recipientId: b.id, dateKey: "2026-07-14" };
    const results = await Promise.allSettled([
      prisma.friendNudge.create({ data }),
      prisma.friendNudge.create({ data }),
    ]);
    expectSingleWinner(results);
    expect(await prisma.friendNudge.count({ where: data })).toBe(1);
  });

  it("deduplicates pending group invitations and weekly commitments", async () => {
    const [a, b] = await users();
    const group = await prisma.group.create({ data: { name: "Race group", inviteCode: crypto.randomUUID() } });
    const dedupeKey = `${a.id}:${b.id}:${group.id}`;
    const expiresAt = new Date(Date.now() + 86_400_000);
    const inviteResults = await Promise.allSettled([
      prisma.groupInvitation.create({ data: { inviterId: a.id, inviteeId: b.id, groupId: group.id, dedupeKey, expiresAt } }),
      prisma.groupInvitation.create({ data: { inviterId: a.id, inviteeId: b.id, groupId: group.id, dedupeKey, expiresAt } }),
    ]);
    expectSingleWinner(inviteResults);

    const commitment = { userAId: a.id, userBId: b.id, requestedById: a.id, targetDaysA: 4, targetDaysB: 5, weekStart: "2026-07-20" };
    const commitmentResults = await Promise.allSettled([
      prisma.friendCommitment.create({ data: commitment }),
      prisma.friendCommitment.create({ data: commitment }),
    ]);
    expectSingleWinner(commitmentResults);
    expect(await prisma.friendCommitment.count({ where: { userAId: a.id, userBId: b.id, weekStart: commitment.weekStart } })).toBe(1);
    await prisma.group.delete({ where: { id: group.id } });
  });
});
