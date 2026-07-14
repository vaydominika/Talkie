import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { recordQuestEvent, userTimezone } from "@/lib/learning-loop";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await auth())!.user;
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { position: "asc" } },
      unit: { include: { course: { select: { slug: true } } } },
    },
  });

  if (!lesson) notFound();

  async function complete() {
    "use server";

    const progress=await prisma.lessonProgress.upsert({
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
    await recordQuestEvent(user.id,await userTimezone(user.id),{key:`lesson:${progress.id}`,type:"LESSON",at:progress.completedAt??new Date(),metadata:{lessonId:lesson!.id}});
    revalidatePath(`/app/courses/${lesson!.unit.course.slug}`);
    revalidatePath(`/app/lessons/${lesson!.id}`);
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
  const richHtml = looksLikeHtml(block.content);

  return (
    <section>
      {block.title ? <h2 className="font-semibold">{block.title}</h2> : null}
      {richHtml ? (
        <div className="prose prose-stone mt-2 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: block.content }} />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{block.content}</p>
      )}
    </section>
  );
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
