import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function CoursesPage() { const courses = await prisma.course.findMany({ where: { status: "PUBLISHED" }, include: { language: true, level: true }, orderBy: { title: "asc" } }); return <><h1 className="text-3xl font-semibold">Courses</h1><div className="mt-6 grid gap-4 md:grid-cols-2">{courses.map(c => <Card key={c.id}><CardHeader><CardTitle>{c.title}</CardTitle><p className="text-sm text-muted-foreground">{c.language.name} · {c.level.code}</p></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{c.description}</p><Button asChild><Link href={`/app/courses/${c.slug}`}>View course</Link></Button></CardContent></Card>)}</div></>; }
