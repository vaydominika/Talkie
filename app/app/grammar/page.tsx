import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function GrammarPage() {
  const points = await prisma.grammarPoint.findMany({
    where: { status: "PUBLISHED" },
    include: { language: true, level: true },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <h1 className="text-3xl font-semibold">Grammar</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {points.map((point) => (
          <GrammarCard key={point.id} point={point} />
        ))}
      </div>
    </>
  );
}

function GrammarCard({
  point,
}: {
  point: {
    title: string;
    summary: string;
    explanation: string;
    language: { name: string };
    level: { code: string } | null;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{point.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {point.language.name} · {point.level?.code}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{point.summary}</p>
        <p className="mt-3 text-sm text-muted-foreground">{point.explanation}</p>
      </CardContent>
    </Card>
  );
}
