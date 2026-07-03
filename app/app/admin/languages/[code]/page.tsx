import { ContentStatus, LanguageTabType, TestQuestionType } from "@prisma/client";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AdminRichEditor } from "@/components/admin-rich-editor";
import { Button } from "@/components/ui/button";
import { languageHref } from "@/lib/language-route";
import { prisma } from "@/lib/prisma";
import {
  createCourse,
  createCourseUnit,
  createGrammarLesson,
  createLesson,
  createLessonBlock,
  createLessonTest,
  createMedia,
  createTab,
  createVocabulary,
  ensureAdmin,
  updateCourse,
  updateCourseUnit,
  updateGrammarLesson,
  updateLesson,
  updateLessonBlock,
  updateTab,
} from "../../actions";
import { Field, Panel, Select, Td, TextArea, Th, Check } from "../../ui";

const statuses = Object.values(ContentStatus);
const tabTypes = Object.values(LanguageTabType);
const questionTypes = Object.values(TestQuestionType);

export default async function AdminLanguagePage({ params }: { params: Promise<{ code: string }> }) {
  await ensureAdmin();
  const { code } = await params;
  const [language, levels] = await Promise.all([
    prisma.language.findUnique({
      where: { code },
      include: {
        tabs: { orderBy: { position: "asc" } },
        media: { orderBy: { createdAt: "desc" } },
        vocabulary: {
          where: { userId: null, groupId: null },
          include: { translations: true, japanese: true, german: true },
          orderBy: { displayForm: "asc" },
        },
        grammar: { include: { level: true }, orderBy: { title: "asc" } },
        courses: {
          include: {
            level: true,
            units: {
              orderBy: { position: "asc" },
              include: {
                lessons: {
                  orderBy: { position: "asc" },
                  include: {
                    blocks: { orderBy: { position: "asc" } },
                    test: { include: { questions: true } },
                  },
                },
              },
            },
          },
          orderBy: { title: "asc" },
        },
      },
    }),
    prisma.proficiencyLevel.findMany({ orderBy: { rank: "asc" } }),
  ]);
  if (!language) notFound();

  const lessons = language.courses.flatMap((course) =>
    course.units.flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, course, unit }))),
  );
  const courseOptions = language.courses.map((course) => [course.id, course.title] as [string, string]);
  const unitOptions = language.courses.flatMap((course) =>
    course.units.map((unit) => [unit.id, `${course.title} / ${unit.title}`] as [string, string]),
  );
  const levelOptions = levels.map((level) => [level.id, `${level.code} - ${level.name}`] as [string, string]);
  const duplicateTemplateWordCount = language.vocabulary.length - new Set(language.vocabulary.map((word) => word.displayForm.toLowerCase().trim())).size;
  const templateVocabulary = Array.from(
    new Map(language.vocabulary.map((word) => [word.displayForm.toLowerCase().trim(), word])).values(),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Back to Content Studio
          </Link>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-rose-700">{language.code}</p>
          <h1 className="font-serif text-4xl">{language.name} template studio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {language.nativeName} - Manage reusable starter tabs, sample words, lessons, images, and gates.
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

        <Panel eyebrow="Starter words" title="Template vocabulary">
          <form action={createVocabulary} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <input type="hidden" name="languageId" value={language.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Word" name="displayForm" placeholder={language.code === "ja" ? "食べる" : "der Tisch"} required />
              <Field label="Meaning" name="definition" placeholder="to eat / table" required />
              <Field label="Pronunciation" name="pronunciation" placeholder="LEHR-nen" />
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
            <Button>Add template vocabulary</Button>
          </form>
          <div className="mt-4 max-h-96 overflow-auto rounded-2xl border">
            {duplicateTemplateWordCount > 0 ? (
              <p className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {duplicateTemplateWordCount} duplicate template word{duplicateTemplateWordCount === 1 ? "" : "s"} hidden. New duplicates are blocked.
              </p>
            ) : null}
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left">
                <tr>
                  <Th>Word</Th>
                  <Th>Meaning</Th>
                  <Th>Meta</Th>
                </tr>
              </thead>
              <tbody>
                {templateVocabulary.map((word) => (
                  <tr key={word.id} className="border-t">
                    <Td>
                      {word.displayForm}
                      {word.pronunciation && <span className="ml-2 text-muted-foreground">[{word.pronunciation}]</span>}
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

        <Panel eyebrow="Stroke order" title="Kana and kanji images">
          {language.code === "ja" ? (
            <form action={createMedia} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
              <input type="hidden" name="languageId" value={language.id} />
              <input type="hidden" name="kind" value="STROKE_ORDER" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Image URL" name="url" placeholder="/stroke-order/a.png" required />
                <Field label="Alt text" name="altText" placeholder="Stroke order for あ" />
                <Field label="Kana or kanji" name="targetKey" placeholder="あ" required />
              </div>
              <TextArea label="Note" name="note" placeholder="Source, license, or usage note" />
              <Button>Add stroke-order image</Button>
            </form>
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              Stroke-order images are only used for Japanese kana and kanji.
            </p>
          )}
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

      <Panel eyebrow="Courses" title="Course lessons">
        <div className="grid gap-4 xl:grid-cols-3">
          <form action={createCourse} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            <input type="hidden" name="languageId" value={language.id} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Course title" name="title" placeholder="Japanese foundations" required />
              <Field label="Slug" name="slug" placeholder="japanese-foundations" />
              <Select label="Level" name="levelId" options={levelOptions} />
              <Select label="Status" name="status" options={statuses.map((status) => [status, status])} defaultValue="PUBLISHED" />
            </div>
            <TextArea label="Description" name="description" placeholder="What this course helps learners do." />
            <Button>Add course</Button>
          </form>

          <form action={createCourseUnit} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            {courseOptions.length ? (
              <>
                <Select label="Course" name="courseId" options={courseOptions} />
                <Field label="Unit title" name="title" placeholder="Unit 1: Sounds and greetings" required />
                <Field label="Position" name="position" type="number" placeholder="Auto" />
                <Button>Add unit</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Create a course before adding units.</p>
            )}
          </form>

          <form action={createLesson} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
            {unitOptions.length ? (
              <>
                <Select label="Unit" name="unitId" options={unitOptions} />
                <Field label="Lesson title" name="title" placeholder="Reading あいうえお" required />
                <Field label="Position" name="position" type="number" placeholder="Auto" />
                <Button>Add lesson</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Create a unit before adding lessons.</p>
            )}
          </form>
        </div>

        <div className="mt-5 space-y-4">
          {language.courses.map((course) => (
            <details key={course.id} className="rounded-2xl border p-4">
              <summary className="cursor-pointer font-semibold">
                {course.title} <span className="font-normal text-muted-foreground">{course.level.code}</span>
              </summary>

              <form action={updateCourse} className="mt-4 grid gap-3 rounded-2xl bg-muted/30 p-3">
                <input type="hidden" name="id" value={course.id} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Title" name="title" defaultValue={course.title} required />
                  <Field label="Slug" name="slug" defaultValue={course.slug} required />
                  <Select label="Level" name="levelId" options={levelOptions} defaultValue={course.levelId} />
                  <Select label="Status" name="status" options={statuses.map((status) => [status, status])} defaultValue={course.status} />
                </div>
                <TextArea label="Description" name="description" defaultValue={course.description} />
                <Button variant="outline">Save course</Button>
              </form>

              <div className="mt-4 space-y-3">
                {course.units.map((unit) => (
                  <details key={unit.id} className="rounded-xl border p-3">
                    <summary className="cursor-pointer font-medium">
                      {unit.position}. {unit.title}
                    </summary>

                    <form action={updateCourseUnit} className="mt-3 grid gap-3 rounded-xl bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                      <input type="hidden" name="id" value={unit.id} />
                      <Field label="Unit title" name="title" defaultValue={unit.title} required />
                      <Field label="Position" name="position" type="number" defaultValue={unit.position} />
                      <Button variant="outline" className="self-end">
                        Save unit
                      </Button>
                    </form>

                    <div className="mt-3 space-y-3">
                      {unit.lessons.map((lesson) => (
                        <details key={lesson.id} className="rounded-xl border p-3">
                          <summary className="cursor-pointer text-sm font-semibold">
                            {lesson.position}. {lesson.title} <span className="font-normal text-muted-foreground">{lesson.blocks.length} blocks</span>
                          </summary>

                          <form action={updateLesson} className="mt-3 grid gap-3 rounded-xl bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                            <input type="hidden" name="id" value={lesson.id} />
                            <Field label="Lesson title" name="title" defaultValue={lesson.title} required />
                            <Field label="Position" name="position" type="number" defaultValue={lesson.position} />
                            <Button variant="outline" className="self-end">
                              Save lesson
                            </Button>
                          </form>

                          <form action={createLessonBlock} className="mt-3 grid gap-3 rounded-xl bg-muted/30 p-3">
                            <input type="hidden" name="lessonId" value={lesson.id} />
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                              <Field label="Block title" name="title" placeholder="Practice note" />
                              <Field label="Position" name="position" type="number" placeholder="Auto" />
                            </div>
                            <AdminRichEditor name="content" />
                            <Button>Add block</Button>
                          </form>

                          <div className="mt-3 space-y-3">
                            {lesson.blocks.map((block) => (
                              <details key={block.id} className="rounded-xl border p-3">
                                <summary className="cursor-pointer text-sm font-medium">
                                  {block.position}. {block.title || "Untitled block"}
                                </summary>
                                <form action={updateLessonBlock} className="mt-3 grid gap-3">
                                  <input type="hidden" name="id" value={block.id} />
                                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                                    <Field label="Block title" name="title" defaultValue={block.title ?? ""} />
                                    <Field label="Position" name="position" type="number" defaultValue={block.position} />
                                  </div>
                                  <AdminRichEditor name="content" initialHtml={block.content} />
                                  <Button variant="outline">Save block</Button>
                                </form>
                              </details>
                            ))}
                            {lesson.blocks.length === 0 ? (
                              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No blocks yet.</p>
                            ) : null}
                          </div>
                        </details>
                      ))}
                      {unit.lessons.length === 0 ? (
                        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No lessons yet.</p>
                      ) : null}
                    </div>
                  </details>
                ))}
                {course.units.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No units yet.</p>
                ) : null}
              </div>
            </details>
          ))}
          {language.courses.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No courses exist for {language.name} yet.</p>
          ) : null}
        </div>
      </Panel>

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
