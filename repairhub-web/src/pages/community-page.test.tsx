import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { resetCommunityThreads } from "../data/mock-data";
import { useAuthStore } from "../state/auth-store";
import { CommunityPage } from "./community-page";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CommunityPage", () => {
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

  it("lets a customer add a question and shows it in recent discussions", async () => {
    act(() => {
      useAuthStore.setState({
        role: "customer",
        user: {
          id: "customer-1",
          email: "customer@example.com",
          first_name: "Elena",
          last_name: "Adeyemi",
          role: "customer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    renderPage();

    expect(await screen.findByText("Recent Discussions")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ask a Question" }));
    fireEvent.change(screen.getByLabelText("Question title"), {
      target: { value: "Can I fix my cracked tablet screen at home?" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Electronics" },
    });
    fireEvent.change(screen.getByLabelText("Details"), {
      target: { value: "I have a Samsung tablet with a cracked screen and want to know if this is safe to repair at home." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Post Question" }));

    expect(await screen.findByText("Can I fix my cracked tablet screen at home?")).toBeInTheDocument();
    expect(screen.getByText("Elena A. · 0 replies · Just now")).toBeInTheDocument();
  });

  it("opens video tutorials on YouTube using the same title", async () => {
    renderPage();

    const tutorialLink = await screen.findByRole("link", { name: /Replace a Phone Battery/i });

    expect(tutorialLink).toHaveAttribute(
      "href",
      "https://www.youtube.com/results?search_query=Replace%20a%20Phone%20Battery",
    );
    expect(tutorialLink).toHaveAttribute("target", "_blank");
  });
});
