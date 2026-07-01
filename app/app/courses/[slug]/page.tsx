import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      units: {
        include: {
          lessons: {
            orderBy: { position: "asc" },
            include: {
              progress: session?.user?.id
                ? {
                    where: { userId: session.user.id },
                    select: { completedAt: true },
                  }
                : false,
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!course) notFound();
  const lessonStates = buildLessonStates(course.units);
  const completedCount = lessonStates.filter((lesson) => lesson.completed).length;
  const nextLessonId = lessonStates.find((lesson) => !lesson.completed)?.id;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{course.title}</h1>
          <p className="mt-2 text-muted-foreground">{course.description}</p>
        </div>
        <p className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
          {completedCount}/{lessonStates.length} lessons complete
        </p>
      </div>
      <div className="mt-6 space-y-4">
        {course.units.map((unit) => (
          <UnitCard key={unit.id} nextLessonId={nextLessonId} unit={unit} />
        ))}
      </div>
    </>
  );
}

function UnitCard({
  nextLessonId,
  unit,
}: {
  nextLessonId?: string;
  unit: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      progress?: { completedAt: Date | null }[];
    }[];
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{unit.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {unit.lessons.map((lesson) => (
            <LessonListItem key={lesson.id} lesson={lesson} next={lesson.id === nextLessonId} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LessonListItem({
  lesson,
  next,
}: {
  lesson: {
    id: string;
    title: string;
    progress?: { completedAt: Date | null }[];
  };
  next: boolean;
}) {
  const completed = Boolean(lesson.progress?.[0]?.completedAt);

  return (
    <li className={`flex items-center justify-between rounded-md border px-3 py-2 ${next ? "border-rose-200 bg-rose-50/50" : ""}`}>
      <span className="flex items-center gap-2">
        <span>{lesson.title}</span>
        {completed ? <span className="rounded-full border border-[#d6dfca] bg-[#e5ebdf] px-2 py-0.5 text-xs text-[#4a5b3b]">Complete</span> : null}
        {next ? <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-xs text-rose-700">Next</span> : null}
      </span>
      <Button asChild variant="outline">
        <Link href={`/app/lessons/${lesson.id}`}>{completed ? "Review" : "Study"}</Link>
      </Button>
    </li>
  );
}

function buildLessonStates(
  units: {
    lessons: {
      id: string;
      progress?: { completedAt: Date | null }[];
    }[];
  }[],
) {
  return units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({
      id: lesson.id,
      completed: Boolean(lesson.progress?.[0]?.completedAt),
    })),
  );
}
