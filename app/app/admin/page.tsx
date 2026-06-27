import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import { createLanguage, ensureAdmin, updateLanguage } from "./actions";
import { Check, Field, Panel, Stat } from "./ui";

export default async function AdminPage() {
  await ensureAdmin();
  const [languages, templateVocabularyCounts] = await Promise.all([
    prisma.language.findMany({
      orderBy: [{ sidebarPosition: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { tabs: true, grammar: true, courses: true, media: true } },
      },
    }),
    prisma.vocabularyEntry.groupBy({
      by: ["languageId"],
      where: { userId: null, groupId: null },
      _count: { _all: true },
    }),
  ]);
  const templateVocabularyCountByLanguage = new Map(templateVocabularyCounts.map((item) => [item.languageId, item._count._all]));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-950 text-stone-50 shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-rose-300">Talkie atelier</p>
            <h1 className="mt-3 font-serif text-4xl">Content Studio.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
              Create reusable starter templates here. Users import these samples into their own private language spaces.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-stone-400">Inventory</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Languages" value={languages.length} />
              <Stat label="Template vocab" value={templateVocabularyCounts.reduce((sum, item) => sum + item._count._all, 0)} />
              <Stat label="Grammar" value={languages.reduce((sum, language) => sum + language._count.grammar, 0)} />
            </dl>
          </div>
        </div>
      </section>

      <Panel eyebrow="Create" title="Add a template language">
        <form action={createLanguage} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
          <div className="grid gap-3 sm:grid-cols-6">
            <Field label="Name" name="name" placeholder="Italian" required />
            <Field label="Native name" name="nativeName" placeholder="Italiano" />
            <Field label="Code" name="code" placeholder="it" required />
            <Field label="TTS provider" name="speechProvider" defaultValue="azure" placeholder="azure" />
            <Field label="Speech locale" name="speechLocale" placeholder="it-IT" />
            <Field label="Neural voice" name="speechVoiceName" placeholder="it-IT-ElsaNeural" />
            <Field label="Position" name="sidebarPosition" type="number" defaultValue={languages.length + 1} />
          </div>
          <p className="text-xs text-muted-foreground">
            Admin languages are reusable templates. A user's own words stay private after import.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Check name="sidebarVisible" label="Show in sidebar" defaultChecked />
            <Button>Add language and open studio</Button>
          </div>
        </form>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-2">
        {languages.map((language) => (
          <article key={language.id} className="rounded-[1.75rem] border bg-background p-7 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{language.code}</p>
                <h2 className="mt-1 font-serif text-2xl">{language.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{language.nativeName}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${language.sidebarVisible ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                {language.sidebarVisible ? "Visible" : "Hidden"}
              </span>
            </div>

            <dl className="mt-6 flex flex-wrap gap-3 text-center text-xs">
              <MiniStat label="Tabs" value={language._count.tabs} />
              <MiniStat label="Template words" value={templateVocabularyCountByLanguage.get(language.id) ?? 0} />
              <MiniStat label="Grammar" value={language._count.grammar} />
              <MiniStat label="Courses" value={language._count.courses} />
              <MiniStat label="Media" value={language._count.media} />
            </dl>

            <form action={updateLanguage} className="mt-5 grid gap-3 rounded-2xl bg-muted/30 p-3">
              <input type="hidden" name="id" value={language.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" name="name" defaultValue={language.name} required />
                <Field label="Native" name="nativeName" defaultValue={language.nativeName} required />
                <Field label="Code" name="code" defaultValue={language.code} required />
                <Field label="TTS provider" name="speechProvider" defaultValue={language.speechProvider ?? "azure"} placeholder="azure" />
                <Field label="Speech locale" name="speechLocale" defaultValue={language.speechLocale} placeholder="de-DE" />
                <Field label="Neural voice" name="speechVoiceName" defaultValue={language.speechVoiceName} placeholder="de-DE-KatjaNeural" />
                <Field label="Position" name="sidebarPosition" type="number" defaultValue={language.sidebarPosition} />
              </div>
              <p className="text-xs text-muted-foreground">
                Accurate pronunciation uses server TTS when <span className="font-mono">AZURE_SPEECH_KEY</span> and <span className="font-mono">AZURE_SPEECH_REGION</span> are configured.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Check name="sidebarVisible" label="Visible in sidebar" defaultChecked={language.sidebarVisible} />
                <Button variant="outline">Save language</Button>
              </div>
            </form>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild>
                <Link href={`/app/admin/languages/${language.code}` as Route}>Open studio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={languageHref(language) as Route}>View page</Link>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[5.75rem] flex-1 rounded-xl bg-muted px-4 py-3">
      <dt className="whitespace-nowrap text-[0.6rem] uppercase leading-tight tracking-normal text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
