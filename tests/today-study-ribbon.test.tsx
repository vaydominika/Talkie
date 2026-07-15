// @vitest-environment jsdom
import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { TodayStudyRibbon } from "@/components/today-study-ribbon";

const mutate=vi.fn();
const push=vi.fn();
const refresh=vi.fn();
const updateStudyPlanItem=vi.fn();
let groupTimer:unknown=null;
vi.mock("next/navigation",()=>({useRouter:()=>({push,refresh})}));
vi.mock("@/components/timer-provider",()=>({useTimer:()=>({snapshot:{group:groupTimer,quests:[]},mutate,setOpen:vi.fn(),busy:false})}));
vi.mock("@/app/app/dashboard/actions",()=>({generateStudyPlan:vi.fn(),updateStudyPlanItem:(data:FormData)=>updateStudyPlanItem(data)}));

const item={id:"item-1",title:"Review German",description:"Scheduled words",href:"/app/de?mode=due",estimatedMinutes:15,status:"PENDING" as const,type:"DUE_REVIEW",referenceId:null,metadata:{languageId:"de"}};
const plan={id:"plan-1",durationMinutes:30,languageId:"de",items:[item]};
const replacements=[
 {id:"due:personal:de",type:"DUE_REVIEW",title:"Review 4 due German words",description:"Scheduled today",context:"Personal vocabulary"},
 {id:"free-focus",type:"FREE_FOCUS",title:"Open focus",description:"Choose your work",context:"Any activity"},
];
const props={plan,quests:[],languages:[{id:"de",name:"German"}],replacementOptions:replacements,defaultMinutes:30,defaultLanguageId:"de"};

describe("Today study ribbon",()=>{
 beforeEach(()=>{groupTimer=null;mutate.mockReset();push.mockReset();refresh.mockReset();updateStudyPlanItem.mockReset()});
 it("stretches the empty plan placeholder to the daily quests height",()=>{render(<TodayStudyRibbon {...props} plan={null}/>);expect(screen.getByText("Build a plan that fits today.").parentElement).toHaveClass("flex","flex-1","items-center","justify-center")});
 it("aligns the plan button with the visible select controls",()=>{render(<TodayStudyRibbon {...props}/>);expect(screen.getByText("Minutes").parentElement).toHaveClass("grid","gap-1.5");expect(screen.getByText("Language").parentElement).toHaveClass("grid","gap-1.5");expect(screen.getByRole("button",{name:"Regenerate"})).toHaveClass("h-9")});
 it("confirms, prepares, starts, and navigates to the exact review mode",async()=>{mutate.mockResolvedValue({});const user=userEvent.setup();render(<TodayStudyRibbon {...props}/>);await user.click(screen.getByRole("button",{name:"Start"}));expect(screen.getByRole("dialog",{name:"Start this focus item?"})).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"Start focus"}));await waitFor(()=>expect(mutate).toHaveBeenCalledTimes(2));expect(mutate).toHaveBeenNthCalledWith(1,expect.objectContaining({action:"prepare",planItemId:"item-1",destination:"/app/de?mode=due"}));expect(mutate).toHaveBeenNthCalledWith(2,{action:"personal",groupId:"start"});expect(push).toHaveBeenCalledWith("/app/de?mode=due")});
 it("blocks a personal launch while a group timer is active",async()=>{groupTimer={id:"group-timer"};const user=userEvent.setup();render(<TodayStudyRibbon {...props}/>);await user.click(screen.getByRole("button",{name:"Start"}));expect(screen.getByRole("alert")).toHaveTextContent("Leave the active group timer");expect(screen.queryByRole("dialog")).not.toBeInTheDocument()});
 it("shows only server-provided eligible replacements and submits the candidate id",async()=>{const user=userEvent.setup();render(<TodayStudyRibbon {...props}/>);await user.click(screen.getByRole("button",{name:"Replace plan item"}));expect(screen.getByText("Review 4 due German words")).toBeInTheDocument();expect(screen.queryByText("Listening")).not.toBeInTheDocument();await user.click(screen.getByRole("radio",{name:/Open focus/}));await user.click(screen.getByRole("button",{name:"Replace activity"}));await waitFor(()=>expect(updateStudyPlanItem).toHaveBeenCalledOnce());const data=updateStudyPlanItem.mock.calls[0][0] as FormData;expect(data.get("candidateId")).toBe("free-focus")});
 it("keeps the replacement dialog accessible",async()=>{const user=userEvent.setup();render(<TodayStudyRibbon {...props}/>);await user.click(screen.getByRole("button",{name:"Replace plan item"}));const result=await axe(screen.getByRole("dialog"),{rules:{"color-contrast":{enabled:false}}});expect(result.violations).toEqual([])});
});
