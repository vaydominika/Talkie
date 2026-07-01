import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: { language: true, level: true },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <h1 className="text-3xl font-semibold">Courses</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </>
  );
}

function CourseCard({
  course,
}: {
  course: {
    slug: string;
    title: string;
    description: string;
    language: { name: string };
    level: { code: string };
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {course.language.name} · {course.level.code}
        </p>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{course.description}</p>
        <Button asChild>
          <Link href={`/app/courses/${course.slug}`}>View course</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
