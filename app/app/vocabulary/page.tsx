import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Word</th>
              <th className="p-3">Meaning</th>
              <th className="p-3">Language</th>
            </tr>
          </thead>
          <tbody>
            {words.map((word) => (
              <tr className="border-t" key={word.id}>
                <td className="p-3 font-medium">
                  {word.displayForm}
                  {word.pronunciation ? <span className="ml-2 text-xs font-normal text-muted-foreground">[{word.pronunciation}]</span> : null}
                  {word.japanese?.kana ? <span className="ml-2 text-muted-foreground">{word.japanese.kana}</span> : null}
                </td>
                <td className="p-3">{word.translations.map((t) => t.text).join(", ")}</td>
                <td className="p-3">{word.language.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
