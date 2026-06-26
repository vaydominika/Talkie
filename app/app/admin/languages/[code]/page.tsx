import { ContentStatus, LanguageTabType, TestQuestionType } from "@prisma/client";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AdminRichEditor } from "@/components/admin-rich-editor";
import { Button } from "@/components/ui/button";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import {
  createGrammarLesson,
  createLessonTest,
  createMedia,
  createTab,
  createVocabulary,
  ensureAdmin,
  updateGrammarLesson,
  updateTab,
} from "../../actions";
import { Field, Panel, Select, Td, TextArea, Th, Check } from "../../ui";

const statuses = Object.values(ContentStatus);
const tabTypes = Object.values(LanguageTabType);
const questionTypes = Object.values(TestQuestionType);

export default async function AdminLanguagePage({ params }: { params: Promise<{ code: string }> }) {
  await ensureAdmin();
  const { code } = await params;
  const language = await prisma.language.findUnique({
    where: { code },
    include: {
      tabs: { orderBy: { position: "asc" } },
      media: { orderBy: { createdAt: "desc" } },
      vocabulary: { include: { translations: true, japanese: true, german: true }, orderBy: { displayForm: "asc" } },
      grammar: { include: { level: true }, orderBy: { title: "asc" } },
      courses: {
        include: {
          units: {
            orderBy: { position: "asc" },
            include: { lessons: { orderBy: { position: "asc" }, include: { test: { include: { questions: true } } } } },
          },
        },
        orderBy: { title: "asc" },
      },
    },
  });
  if (!language) notFound();

  const lessons = language.courses.flatMap((course) =>
    course.units.flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, course, unit }))),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Back to Content Studio
          </Link>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-rose-700">{language.code}</p>
          <h1 className="font-serif text-4xl">{language.name} studio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {language.nativeName} - Manage this language&apos;s learner page, words, lessons, images, and gates.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={languageHref(language) as Route}>View learner page</Link>
        </Button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Navigation" title="Tabs">
          <form action={createTab} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <input type="hidden" name="languageId" value={language.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" name="title" placeholder="Reading" required />
              <Field label="Slug" name="slug" placeholder="reading" required />
              <Select label="Type" name="type" options={tabTypes.map((type) => [type, type])} />
              <Select label="Status" name="status" options={statuses.map((status) => [status, status])} defaultValue="PUBLISHED" />
              <Field label="Position" name="position" type="number" placeholder="Auto" />
            </div>
            <TextArea label="Editor note" name="content" placeholder="What should this tab contain?" />
            <Button>Add tab</Button>
          </form>
          <div className="mt-4 space-y-3">
            {language.tabs.map((tab) => (
              <details key={tab.id} className="rounded-2xl border p-4">
                <summary className="cursor-pointer font-semibold">
                  {tab.position}. {tab.title} <span className="font-normal text-muted-foreground">/{tab.slug}</span>
                </summary>
                <form action={updateTab} className="mt-4 grid gap-3">
                  <input type="hidden" name="id" value={tab.id} />
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="Title" name="title" defaultValue={tab.title} required />
                    <Field label="Slug" name="slug" defaultValue={tab.slug} required />
                    <Select label="Type" name="type" defaultValue={tab.type} options={tabTypes.map((type) => [type, type])} />
                    <Select label="Status" name="status" defaultValue={tab.status} options={statuses.map((status) => [status, status])} />
                  </div>
                  <TextArea
                    label="Editor note"
                    name="content"
                    defaultValue={
                      typeof tab.content === "object" && tab.content && "note" in tab.content ? String(tab.content.note ?? "") : ""
                    }
                  />
                  <Button variant="outline">Save tab</Button>
                </form>
              </details>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Words" title="Vocabulary">
          <form action={createVocabulary} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <input type="hidden" name="languageId" value={language.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Word" name="displayForm" placeholder={language.code === "ja" ? "食べる" : "der Tisch"} required />
              <Field label="Meaning" name="definition" placeholder="to eat / table" required />
              <Field label="Part of speech" name="partOfSpeech" placeholder="noun, verb, adjective..." />
              {language.code === "ja" ? (
                <>
                  <Field label="Kana" name="kana" placeholder="たべる" />
                  <Field label="Romaji" name="romaji" placeholder="taberu" />
                </>
              ) : null}
              {language.code === "de" ? (
                <>
                  <Field label="Article" name="article" placeholder="der" />
                  <Field label="Plural" name="plural" placeholder="Tische" />
                </>
              ) : null}
            </div>
            <Check name="addToFlashcards" label="Add to flashcards" defaultChecked />
            <Button>Add vocabulary</Button>
          </form>
          <div className="mt-4 max-h-96 overflow-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left">
                <tr>
                  <Th>Word</Th>
                  <Th>Meaning</Th>
                  <Th>Meta</Th>
                </tr>
              </thead>
              <tbody>
                {language.vocabulary.map((word) => (
                  <tr key={word.id} className="border-t">
                    <Td>
                      {word.displayForm}
                      {word.japanese?.kana && <span className="ml-2 text-muted-foreground">{word.japanese.kana}</span>}
                    </Td>
                    <Td>{word.translations.map((translation) => translation.text).join(", ") || word.definition}</Td>
                    <Td>
                      {word.partOfSpeech}
                      {word.german?.article ? ` - ${word.german.article}` : ""}
                      {word.german?.plural ? ` - plural ${word.german.plural}` : ""}
                      {word.japanese?.romaji ? ` - ${word.japanese.romaji}` : ""}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel eyebrow="Grammar" title="Lessons">
          <form action={createGrammarLesson} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <input type="hidden" name="languageId" value={language.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" name="title" placeholder="Particles: は and が" required />
              <Select label="Status" name="status" options={statuses.map((status) => [status, status])} defaultValue="PUBLISHED" />
            </div>
            <TextArea label="Summary" name="summary" placeholder="A one-line description for cards and lists." />
            <AdminRichEditor name="richContent" />
            <Button>Add grammar lesson</Button>
          </form>
          <div className="mt-4 space-y-3">
            {language.grammar.map((lesson) => {
              const richContent = lesson.richContent as { html?: string } | null;
              return (
                <details key={lesson.id} className="rounded-2xl border p-4">
                  <summary className="cursor-pointer font-semibold">
                    {lesson.title} <span className="font-normal text-muted-foreground">{lesson.level?.code}</span>
                  </summary>
                  <form action={updateGrammarLesson} className="mt-4 grid gap-3">
                    <input type="hidden" name="id" value={lesson.id} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Title" name="title" defaultValue={lesson.title} required />
                      <Field label="Summary" name="summary" defaultValue={lesson.summary} />
                      <Select label="Status" name="status" options={statuses.map((status) => [status, status])} defaultValue={lesson.status} />
                    </div>
                    <AdminRichEditor name="richContent" initialHtml={richContent?.html ?? lesson.explanation} />
                    <Button variant="outline">Save lesson</Button>
                  </form>
                </details>
              );
            })}
          </div>
        </Panel>

        <Panel eyebrow="Images" title="Media">
          <form action={createMedia} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <input type="hidden" name="languageId" value={language.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="URL" name="url" placeholder="/stroke-order/a.png" required />
              <Field label="Alt text" name="altText" placeholder="Stroke order for あ" />
              <Field label="Kind" name="kind" defaultValue="STROKE_ORDER" />
              <Field label="Target key" name="targetKey" placeholder="あ" />
            </div>
            <TextArea label="Note" name="note" placeholder="Source, license, or usage note" />
            <Button>Add media</Button>
          </form>
          <div className="mt-4 grid gap-3">
            {language.media.map((asset) => (
              <div key={asset.id} className="rounded-2xl border p-3 text-sm">
                <p className="font-medium">
                  {asset.kind}
                  {asset.targetKey ? ` - ${asset.targetKey}` : ""}
                </p>
                <p className="break-all text-muted-foreground">{asset.url}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel eyebrow="Progress gates" title="Tests">
        {lessons.length ? (
          <form action={createLessonTest} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <Select
              label="Lesson"
              name="lessonId"
              options={lessons.map((lesson) => [lesson.id, `${lesson.course.title} / ${lesson.unit.title} / ${lesson.title}`])}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Test title" name="title" placeholder="Can you continue?" />
              <Field label="Required score" name="requiredScore" type="number" defaultValue="80" />
            </div>
            <Select label="Status" name="status" options={statuses.map((status) => [status, status])} defaultValue="DRAFT" />
            <Select label="Question type" name="type" options={questionTypes.map((type) => [type, type])} />
            <TextArea label="Prompt" name="prompt" required placeholder="Translate: I eat sushi." />
            <TextArea label="Options, one per line" name="options" placeholder={"I eat sushi\nI drink water"} />
            <Field label="Correct answer" name="answer" required />
            <Check name="unlockNextLesson" label="Passing unlocks the next lesson" />
            <Button>Add test question</Button>
          </form>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            No course lessons exist for {language.name} yet.
          </p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {lessons
            .filter((lesson) => lesson.test)
            .map((lesson) => (
              <div key={lesson.id} className="rounded-2xl border p-4">
                <p className="font-semibold">{lesson.test?.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lesson.title} - {lesson.test?.questions.length ?? 0} questions - pass at {lesson.test?.requiredScore}%
                </p>
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}
