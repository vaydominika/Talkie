// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";
import { AppModal } from "@/components/app-modal";
import { AccentThemeProvider } from "@/components/accent-theme-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { MobileNav } from "@/components/mobile-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { SidebarSeparator } from "@/components/ui/sidebar";
import { SidebarLink } from "@/components/sidebar-link";

const setTheme=vi.fn();
vi.mock("next-themes",()=>({useTheme:()=>({theme:"system",setTheme})}));
vi.mock("next/navigation",()=>({usePathname:()=>"/app/dashboard"}));

describe("shadcn application shell",()=>{
  it("uses only an outline to mark the active sidebar item",()=>{
    render(<><SidebarLink href="/app/dashboard" exact>Dashboard</SidebarLink><SidebarLink href="/app/friends">Friends</SidebarLink></>);
    expect(screen.getByRole("link",{name:"Dashboard"})).toHaveClass("border-sidebar-border","bg-transparent");
    expect(screen.getByRole("link",{name:"Dashboard"})).not.toHaveClass("before:bg-ring");
    expect(screen.getByRole("link",{name:"Friends"})).toHaveClass("border-transparent");
  });

  it("keeps sidebar separators inside both sidebar edges",()=>{
    render(<SidebarSeparator/>);
    expect(document.querySelector('[data-slot="sidebar-separator"]')).toHaveClass("mx-2","w-[calc(100%-1rem)]!");
  });

  it("layers popovers above the floating timer",()=>{
    render(<Popover defaultOpen><PopoverTrigger>Settings</PopoverTrigger><PopoverContent>Timer settings</PopoverContent></Popover>);
    expect(screen.getByText("Timer settings")).toHaveClass("z-[130]");
  });

  it("uses the centralized accent color for card borders",()=>{
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toHaveClass("border-accent");
  });

  it("uses the centralized accent across every button variant and switch state",()=>{
    for(const variant of ["default","destructive","accent","outline","secondary","ghost","link"] as const){
      expect(buttonVariants({variant})).toContain("bg-accent");
    }
    render(<Switch defaultChecked aria-label="Pink switch"/>);
    const control=screen.getByRole("switch",{name:"Pink switch"});
    expect(control).toHaveClass("data-[state=checked]:bg-ring");
    expect(control).toHaveClass("data-[state=unchecked]:bg-accent/25");
    expect(control.querySelector('[data-slot="switch-thumb"]')).toHaveClass("bg-accent");
  });

  it("keeps input fields neutral with an accent border",()=>{
    render(<Input aria-label="Pink input"/>);
    expect(screen.getByRole("textbox",{name:"Pink input"})).toHaveClass("border-input","bg-background","text-foreground","caret-ring");
  });

  it("offers light, dark, and system themes",async()=>{
    const user=userEvent.setup();render(<AccentThemeProvider><ModeToggle/></AccentThemeProvider>);
    await user.click(screen.getByRole("button",{name:"Change color theme"}));
    await user.click(screen.getByRole("menuitemradio",{name:"Dark"}));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("persists and applies accent themes globally",async()=>{
    const user=userEvent.setup();
    render(<AccentThemeProvider><ModeToggle/></AccentThemeProvider>);
    await user.click(screen.getByRole("button",{name:"Change color theme"}));
    await user.click(screen.getByRole("menuitemradio",{name:"Sage green"}));
    expect(document.documentElement).toHaveAttribute("data-accent-theme","sage");
    expect(localStorage.getItem("talkie-accent-theme")).toBe("sage");
  });

  it("closes dialogs with Escape and restores focus",async()=>{
    const user=userEvent.setup();
    function Harness(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Open dialog</button>{open&&<AppModal title="Accessible dialog" description="Dialog description" onClose={()=>setOpen(false)}><button>Inside</button></AppModal>}</>}
    render(<Harness/>);const trigger=screen.getByRole("button",{name:"Open dialog"});await user.click(trigger);
    expect(screen.getByRole("dialog",{name:"Accessible dialog"})).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());expect(trigger).toHaveFocus();
  });

  it("keeps empty server-action select values intact",async()=>{
    const user=userEvent.setup();render(<form data-testid="form"><FormSelect name="languageId" options={[{value:"",label:"All languages"},{value:"de",label:"German"}]}/></form>);
    expect(new FormData(screen.getByTestId("form") as HTMLFormElement).get("languageId")).toBe("");
    await user.click(screen.getByRole("combobox"));await user.click(screen.getByRole("option",{name:"German"}));
    await waitFor(()=>expect(new FormData(screen.getByTestId("form") as HTMLFormElement).get("languageId")).toBe("de"));
  });

  it("uses a Sheet for mobile navigation and closes after a link click",async()=>{
    const user=userEvent.setup();render(<MobileNav><Link href="/app/friends">Friends</Link></MobileNav>);
    await user.click(screen.getByRole("button",{name:"Open navigation"}));
    expect(screen.getByRole("dialog",{name:"Talkie"})).toBeInTheDocument();
    await user.click(screen.getByRole("link",{name:"Friends"}));
    await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Talkie"})).not.toBeInTheDocument());
  });
});
