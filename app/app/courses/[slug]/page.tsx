import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) { const course = await prisma.course.findUnique({ where: { slug: (await params).slug }, include: { units: { include: { lessons: true }, orderBy: { position: "asc" } } } }); if (!course) notFound(); return <><h1 className="text-3xl font-semibold">{course.title}</h1><p className="mt-2 text-muted-foreground">{course.description}</p><div className="mt-6 space-y-4">{course.units.map(unit => <Card key={unit.id}><CardHeader><CardTitle>{unit.title}</CardTitle></CardHeader><CardContent><ul className="space-y-2">{unit.lessons.map(lesson => <li className="flex items-center justify-between" key={lesson.id}><span>{lesson.title}</span><Button asChild variant="outline"><Link href={`/app/lessons/${lesson.id}`}>Study</Link></Button></li>)}</ul></CardContent></Card>)}</div></>; }
