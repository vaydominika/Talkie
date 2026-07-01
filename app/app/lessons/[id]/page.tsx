import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await auth())!.user;
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { blocks: { orderBy: { position: "asc" } } },
  });

  if (!lesson) notFound();

  async function complete() {
    "use server";

    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson!.id,
        },
      },
      update: {
        completedBlocks: lesson!.blocks.length,
        completedAt: new Date(),
      },
      create: {
        userId: user.id,
        lessonId: lesson!.id,
        completedBlocks: lesson!.blocks.length,
        completedAt: new Date(),
      },
    });
  }

  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">{lesson.title}</h1>
      <div className="mt-8 space-y-8">
        {lesson.blocks.map((block) => (
          <LessonBlock key={block.id} block={block} />
        ))}
      </div>
      <form action={complete} className="mt-10">
        <Button>Mark lesson complete</Button>
      </form>
    </article>
  );
}

function LessonBlock({ block }: { block: { title: string | null; content: string } }) {
  return (
    <section>
      {block.title ? <h2 className="font-semibold">{block.title}</h2> : null}
      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{block.content}</p>
    </section>
  );
}
