import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addLanguageToProfile, removeLanguageFromProfile } from "./actions";

export default async function ManageLanguagesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Retrieve all languages and user's profile languages
  const [allLanguages, profileLanguages] = await Promise.all([
    prisma.language.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.userLanguage.findMany({
      where: { userId: session.user.id },
      select: { languageId: true },
    }),
  ]);

  const activeLanguageIds = new Set(profileLanguages.map((p) => p.languageId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">My Languages</h1>
        <p className="mt-1 text-muted-foreground">
          Import starter language templates into your private study space. Words you add afterward stay yours.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {allLanguages.map((language) => {
          const isActive = activeLanguageIds.has(language.id);
          return (
            <Card key={language.id} className={`hover:shadow-sm transition-all border ${isActive ? "border-rose-200 bg-rose-50/10" : ""}`}>
              <CardHeader>
                <CardTitle className="text-xl font-bold flex justify-between items-center">
                  <span>{language.name}</span>
                  <span className="text-xs font-normal text-muted-foreground font-mono uppercase tracking-wider">
                    {language.code}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{language.nativeName}</p>
              </CardHeader>
              <CardContent>
                {isActive ? (
                  <div className="space-y-2">
                    <form action={addLanguageToProfile}>
                      <input type="hidden" name="languageId" value={language.id} />
                      <Button type="submit" variant="outline" className="w-full">
                        Import starter words
                      </Button>
                    </form>
                    <form action={removeLanguageFromProfile}>
                      <input type="hidden" name="languageId" value={language.id} />
                      <Button type="submit" variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50">
                        Remove from My Languages
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form action={addLanguageToProfile}>
                    <input type="hidden" name="languageId" value={language.id} />
                    <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                      Import starter template
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
