import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function VocabularyPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const words = await prisma.vocabularyEntry.findMany({
    where: {
      userId: session.user.id,
      groupId: null,
    },
    include: { language: true, translations: true, japanese: true, german: true },
    orderBy: { displayForm: "asc" },
  });

  return (
    <>
      <h1 className="text-3xl font-semibold">Vocabulary</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border">
        <Table className="w-full text-sm">
          <TableHeader className="bg-muted text-left">
            <TableRow>
              <TableHead className="p-3">Word</TableHead>
              <TableHead className="p-3">Meaning</TableHead>
              <TableHead className="p-3">Language</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((word) => (
              <TableRow className="border-t" key={word.id}>
                <TableCell className="p-3 font-medium">
                  {word.displayForm}
                  {word.pronunciation ? <span className="ml-2 text-xs font-normal text-muted-foreground">[{word.pronunciation}]</span> : null}
                  {word.japanese?.kana ? <span className="ml-2 text-muted-foreground">{word.japanese.kana}</span> : null}
                </TableCell>
                <TableCell className="p-3">{word.translations.map((t) => t.text).join(", ")}</TableCell>
                <TableCell className="p-3">{word.language.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
