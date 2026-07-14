import {describe,expect,it} from "vitest";
import {canonicalFriendPair,completedCommitmentDays,goalStreak} from "@/lib/friends";
const day=(dateKey:string,done=true)=>({dateKey,focusedSeconds:done?900:0,targetMinutes:15,carryOverMinutes:0});
describe("friend progress",()=>{it("canonicalizes pairs",()=>expect(canonicalFriendPair("z","a")).toEqual(["a","z"]));it("counts only completed commitment days",()=>expect(completedCommitmentDays([day("2026-07-06"),day("2026-07-07",false),day("2026-07-12")],"2026-07-06")).toBe(2));it("stops a goal streak at the first incomplete day",()=>expect(goalStreak([day("2026-07-12"),day("2026-07-11"),day("2026-07-10",false)])).toBe(2));it("breaks a streak when a local date is missing",()=>expect(goalStreak([day("2026-07-12"),day("2026-07-10")])).toBe(1));});
