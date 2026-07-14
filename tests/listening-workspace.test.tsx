// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListeningWorkspace } from "@/components/listening-workspace";

const languages = [{ id: "de", name: "German", code: "de", speechLocale: "de-DE", speechVoiceName: "de-Talkie", samples: ["Guten Morgen. Wie geht es dir?"] }];
let createdAudio: FakeAudio | null;
let objectUrl = 0;
const revokeObjectURL = vi.fn();

class FakeAudio {
  currentTime = 0; ended = false; playbackRate = 1;
  onplay: (() => void) | null = null; onpause: (() => void) | null = null; onended: (() => void) | null = null;
  constructor(public src: string) { createdAudio = this; }
  play = vi.fn(async () => { this.currentTime = 1; this.onplay?.(); });
  pause = vi.fn(() => this.onpause?.());
}
class FakeUtterance {
  lang = ""; rate = 1; voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
class FakeRecorder {
  state: RecordingState = "inactive"; mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null; onerror: (() => void) | null = null; onstop: (() => void) | null = null;
  constructor(public stream: MediaStream) {}
  start() { this.state = "recording"; }
  stop() { if (this.state === "inactive") return; this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["voice"]) }); this.onstop?.(); }
}

beforeEach(() => {
  createdAudio = null; objectUrl = 0; revokeObjectURL.mockReset();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["audio"]), { status: 200 })));
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => `blob:test-${++objectUrl}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel: vi.fn(), pause: vi.fn(), speak: vi.fn(), getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn() } });
});

describe("Listening workspace", () => {
  it("uses Talkie TTS, applies speed, and records a round only after playback", async () => {
    const saveRound = vi.fn(); const user = userEvent.setup();
    render(<ListeningWorkspace languages={languages} saveRound={saveRound} />);
    const complete = screen.getByRole("button", { name: "Complete listening round" });
    expect(complete).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Speed"), "1.15");
    await user.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/tts", expect.objectContaining({ method: "POST" })));
    expect(createdAudio?.playbackRate).toBe(1.15); expect(complete).toBeEnabled();
    await user.click(complete); await waitFor(() => expect(saveRound).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Round recorded" })).toBeDisabled();
  });

  it("shows microphone denial inline", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => { throw new DOMException("denied", "NotAllowedError"); }) } });
    const user = userEvent.setup(); render(<ListeningWorkspace languages={languages} saveRound={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Record attempt" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Microphone permission was denied");
  });

  it("stops tracks and revokes temporary recordings when cleared", async () => {
    const stopTrack = vi.fn(); const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    const user = userEvent.setup(); render(<ListeningWorkspace languages={languages} saveRound={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Record attempt" })); await user.click(screen.getByRole("button", { name: "Stop recording" }));
    await user.click(await screen.findByRole("button", { name: "Clear recording" }));
    expect(stopTrack).toHaveBeenCalled(); expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-1");
  });

  it("supports keyboard playback, hiding, navigation, and stopping", async () => {
    render(<ListeningWorkspace languages={languages} saveRound={vi.fn()} />);
    fireEvent.keyDown(window, { code: "Space", key: " " }); await waitFor(() => expect(createdAudio?.play).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: "h" }); expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" }); expect(screen.getByText("Phrase 2 / 2")).toBeInTheDocument();
    act(() => fireEvent.keyDown(window, { key: "Escape" })); expect(createdAudio?.pause).toHaveBeenCalled();
  });
});
