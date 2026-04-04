import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { resetCommunityThreads } from "../data/mock-data";
import { useAuthStore } from "../state/auth-store";
import { CommunityPageOwnerTools } from "./community-page-owner-tools";

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
        <CommunityPageOwnerTools />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CommunityPageOwnerTools", () => {
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

  it("lets a customer add a question and shows owner controls on their own thread", async () => {
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
    expect(screen.getByText(/Elena A\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("lets the owner edit and delete their own question from recent discussions", async () => {
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
      target: { value: "Can a split chair rail be glued back together?" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Furniture" },
    });
    fireEvent.change(screen.getByLabelText("Details"), {
      target: { value: "The wood split along the rail and I want to know whether glue and clamping will hold or if it needs reinforcement." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post Question" }));

    expect(await screen.findByText("Can a split chair rail be glued back together?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Question title"), {
      target: { value: "Can a split dining chair rail be glued back together?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Question" }));

    expect(await screen.findByText("Can a split dining chair rail be glued back together?")).toBeInTheDocument();
    expect(screen.queryByText("Can a split chair rail be glued back together?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.queryByText("Can a split dining chair rail be glued back together?")).not.toBeInTheDocument();
  });
});
