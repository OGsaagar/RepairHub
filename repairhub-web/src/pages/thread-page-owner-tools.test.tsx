import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createCommunityThread, fetchCommunityData, resetCommunityThreads, type CommunityData } from "../data/mock-data";
import { useAuthStore } from "../state/auth-store";
import { ThreadPageOwnerTools } from "./thread-page-owner-tools";

describe("ThreadPageOwnerTools", () => {
  afterEach(() => {
    localStorage.clear();
    resetCommunityThreads();
    act(() => {
      useAuthStore.setState({
        role: "guest",
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    });
  });

  it("lets signed-in users reply and then edit and delete their own reply", async () => {
    const thread = await createCommunityThread({
      title: "How do I stop my bike brakes from squeaking?",
      category: "Bikes",
      body: "The brakes work, but they squeak every time I slow down. I already cleaned the rims once.",
      author: "Elena A.",
      authorUserId: "customer-1",
    });

    act(() => {
      useAuthStore.setState({
        role: "repairer",
        user: {
          id: "repairer-1",
          email: "repairer@example.com",
          first_name: "Marcus",
          last_name: "Rivera",
          role: "repairer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    await queryClient.prefetchQuery({
      queryKey: ["community"],
      queryFn: fetchCommunityData,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/community/thread/${thread.id}`]}>
          <Routes>
            <Route path="/community/thread/:threadId" element={<ThreadPageOwnerTools />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("How do I stop my bike brakes from squeaking?")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Add your reply"), {
      target: { value: "Inspect the brake pads for glazing and lightly sand them if the surface is hardened. Also check the rim for any oily residue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post Reply" }));

    expect(await screen.findByText("Inspect the brake pads for glazing and lightly sand them if the surface is hardened. Also check the rim for any oily residue.")).toBeInTheDocument();
    expect(screen.getByText("Marcus R.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit your reply"), {
      target: { value: "Inspect the brake pads for glazing, lightly sand them, and wipe the rim with isopropyl alcohol to remove any oily residue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Reply" }));

    expect(await screen.findByText("Inspect the brake pads for glazing, lightly sand them, and wipe the rim with isopropyl alcohol to remove any oily residue.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Inspect the brake pads for glazing, lightly sand them, and wipe the rim with isopropyl alcohol to remove any oily residue."),
      ).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const communityData = queryClient.getQueryData<CommunityData>(["community"]);
      expect(communityData?.threads.find((item) => item.id === thread.id)?.replies).toBe(0);
    });
  });
});
