import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListeningWorkspace } from "@/components/listening-workspace";
import { saveListeningRound } from "./actions";
import { redirect } from "next/navigation";
export default async function ListeningPage({searchParams}:{searchParams:Promise<{language?:string}>}){
 const session=await auth();if(!session?.user?.id)redirect("/sign-in");const {language}=await searchParams;
 const languages=await prisma.language.findMany({where:{users:{some:{userId:session.user.id}}},include:{vocabulary:{where:{OR:[{userId:session.user.id},{group:{members:{some:{userId:session.user.id}}}}]},take:12}},orderBy:{name:"asc"}});
 const blocks=languages.length?await prisma.lessonBlock.findMany({where:{lesson:{unit:{course:{languageId:{in:languages.map(item=>item.id)},status:"PUBLISHED"}}}},select:{content:true,lesson:{select:{unit:{select:{course:{select:{languageId:true}}}}}}},take:24}):[];
 const lessonSamples=new Map<string,string[]>();for(const block of blocks){const text=block.content.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,300);if(text){const id=block.lesson.unit.course.languageId;lessonSamples.set(id,[...(lessonSamples.get(id)??[]),text]);}}
 return <div className="space-y-6"><header><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-700">Listen · repeat · shadow</p><h1 className="mt-1 text-3xl font-semibold">Listening workspace</h1><p className="mt-1 text-muted-foreground">Train your ear and voice one phrase at a time.</p></header>{languages.length?<ListeningWorkspace initialLanguageId={language} saveRound={saveListeningRound} languages={languages.map(item=>({id:item.id,name:item.name,code:item.code,speechLocale:item.speechLocale,speechVoiceName:item.speechVoiceName,samples:[...item.vocabulary.map(word=>word.displayForm),...(lessonSamples.get(item.id)??[])]}))}/>:<p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Add a language before starting listening practice.</p>}</div>
}
