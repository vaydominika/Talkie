import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      units: {
        include: { lessons: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!course) notFound();

  return (
    <>
      <h1 className="text-3xl font-semibold">{course.title}</h1>
      <p className="mt-2 text-muted-foreground">{course.description}</p>
      <div className="mt-6 space-y-4">
        {course.units.map((unit) => (
          <UnitCard key={unit.id} unit={unit} />
        ))}
      </div>
    </>
  );
}

function UnitCard({
  unit,
}: {
  unit: {
    id: string;
    title: string;
    lessons: { id: string; title: string }[];
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
            <LessonListItem key={lesson.id} lesson={lesson} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LessonListItem({ lesson }: { lesson: { id: string; title: string } }) {
  return (
    <li className="flex items-center justify-between">
      <span>{lesson.title}</span>
      <Button asChild variant="outline">
        <Link href={`/app/lessons/${lesson.id}`}>Study</Link>
      </Button>
    </li>
  );
}
