// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddFriendButton } from "@/components/add-friend-button";

const refresh = vi.fn();
const sendFriendRequest = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/app/friends/actions", () => ({ sendFriendRequest: (formData: FormData) => sendFriendRequest(formData) }));

describe("add friend button", () => {
  beforeEach(() => { refresh.mockReset(); sendFriendRequest.mockReset(); });

  it("shows a durable pending state after sending a request", async () => {
    sendFriendRequest.mockResolvedValue({ status: "PENDING", message: "Friend request sent." });
    const user = userEvent.setup();
    render(<AddFriendButton recipientId="friend-1" />);

    await user.click(screen.getByRole("button", { name: "Add friend" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Friend request sent" })).toBeDisabled());
    expect(screen.getByText("Friend request sent.")).toBeInTheDocument();
    expect(sendFriendRequest).toHaveBeenCalledOnce();
    expect((sendFriendRequest.mock.calls[0][0] as FormData).get("recipientId")).toBe("friend-1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("includes group context for the icon-only member action", async () => {
    sendFriendRequest.mockResolvedValue({ status: "FRIENDS", message: "You are now friends." });
    const user = userEvent.setup();
    render(<AddFriendButton recipientId="friend-2" groupId="group-1" iconOnly initialStatus="INCOMING" />);

    await user.click(screen.getByRole("button", { name: "Accept friend request" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Already friends" })).toBeDisabled());
    const formData = sendFriendRequest.mock.calls[0][0] as FormData;
    expect(formData.get("source")).toBe("group");
    expect(formData.get("groupId")).toBe("group-1");
  });
});
