// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimerProvider, TimerTrigger } from "@/components/timer-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const snapshot = {
  serverNow: "2026-07-15T10:00:00.000Z",
  personal: { id: "timer-1", phase: "FOCUS", isRunning: false, endsAt: null, remainingSeconds: 1500, focusMinutes: 25, breakMinutes: 5, autoStart: false, version: 1 },
  group: null,
  proposal: null,
  notice: null,
  recap: null,
  unreadNotifications: 0,
  quests: [],
  daily: { today: { id: "daily-1", dateKey: "2026-07-15", focusedSeconds: 0, focusSessions: 0, targetMinutes: 30, carryOverMinutes: 0, completionShown: false }, effectiveTarget: 30, completed: false, carryPrompt: null },
};

describe("floating timer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot }));
    localStorage.clear();
  });

  it("expands settings inside the timer card instead of opening a popover", async () => {
    const user = userEvent.setup();
    render(<TooltipProvider><TimerProvider userId="user-1"><TimerTrigger /></TimerProvider></TooltipProvider>);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Open study timer" }));
    const timer = screen.getByLabelText("Study timer");
    const settingsButton = within(timer).getByRole("button", { name: "Timer settings" });
    const settingsPanel = timer.querySelector('[data-slot="timer-settings-panel"]');
    expect(settingsPanel).toHaveAttribute("aria-hidden", "true");
    expect(settingsPanel).toHaveClass("grid-rows-[0fr]", "duration-300");
    await user.click(settingsButton);
    expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    expect(settingsPanel).toHaveAttribute("aria-hidden", "false");
    expect(settingsPanel).toHaveClass("grid-rows-[1fr]", "opacity-100");
    expect(within(timer).getByText("Timer settings")).toBeInTheDocument();
    expect(within(timer).getByLabelText("Focus minutes")).toBeInTheDocument();
  });
});
