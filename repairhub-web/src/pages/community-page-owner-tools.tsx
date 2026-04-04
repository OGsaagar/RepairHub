import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { PageHeader } from "../components/shared/page-header";
import {
  createCommunityThread,
  deleteCommunityThread,
  fetchCommunityData,
  type CommunityData,
  type HomePageData,
  type ThreadDetail,
  updateCommunityThread,
} from "../data/mock-data";
import { useAuthStore } from "../state/auth-store";

const askQuestionSchema = z.object({
  title: z.string().min(8, "Enter a clear question title"),
  category: z.enum(["Electronics", "Clothing", "Furniture", "Bikes"]),
  body: z.string().min(20, "Add a few more details so repairers can help"),
});

type AskQuestionValues = z.infer<typeof askQuestionSchema>;

const interactiveSurfaceCardClass = "transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]";
const interactiveBlockClass = "block transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]";

function getAuthorName(firstName: string | undefined, lastName: string | undefined, email: string | undefined) {
  if (firstName && lastName) {
    return `${firstName} ${lastName.charAt(0)}.`;
  }

  if (firstName) {
    return firstName;
  }

  return email ?? "RepairHub Member";
}

function syncThreadIntoCaches(queryClient: ReturnType<typeof useQueryClient>, thread: ThreadDetail) {
  queryClient.setQueryData(["thread", thread.id], thread);
  queryClient.setQueryData<CommunityData>(["community"], (current) =>
    current
      ? {
          ...current,
          threads: [thread, ...current.threads.filter((item) => item.id !== thread.id)],
        }
      : current,
  );
  queryClient.setQueryData<HomePageData>(["home"], (current) =>
    current
      ? {
          ...current,
          threads: [thread, ...current.threads.filter((item) => item.id !== thread.id)],
        }
      : current,
  );
}

export function CommunityPageOwnerTools() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCustomer = isAuthenticated && role === "customer";
  const form = useForm<AskQuestionValues>({
    resolver: zodResolver(askQuestionSchema),
    defaultValues: {
      title: "",
      category: "Electronics",
      body: "",
    },
  });
  const editForm = useForm<AskQuestionValues>({
    resolver: zodResolver(askQuestionSchema),
    defaultValues: {
      title: "",
      category: "Electronics",
      body: "",
    },
  });

  const { data } = useQuery({
    queryKey: ["community"],
    queryFn: fetchCommunityData,
  });

  const createThreadMutation = useMutation({
    mutationFn: (values: AskQuestionValues) =>
      createCommunityThread({
        ...values,
        author: getAuthorName(user?.first_name, user?.last_name, user?.email),
        authorUserId: user?.id ?? "",
      }),
    onSuccess: (thread) => {
      syncThreadIntoCaches(queryClient, thread);
      form.reset({
        title: "",
        category: "Electronics",
        body: "",
      });
      setIsComposerOpen(false);
    },
  });

  const updateThreadMutation = useMutation({
    mutationFn: (values: AskQuestionValues) =>
      updateCommunityThread(editingThreadId ?? "", {
        ...values,
        authorUserId: user?.id ?? "",
      }),
    onSuccess: (thread) => {
      syncThreadIntoCaches(queryClient, thread);
      setEditingThreadId(null);
      editForm.reset({
        title: "",
        category: "Electronics",
        body: "",
      });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => deleteCommunityThread(threadId, user?.id ?? ""),
    onSuccess: (threadId) => {
      queryClient.removeQueries({ queryKey: ["thread", threadId] });
      queryClient.setQueryData<CommunityData>(["community"], (current) =>
        current
          ? {
              ...current,
              threads: current.threads.filter((item) => item.id !== threadId),
            }
          : current,
      );
      queryClient.setQueryData<HomePageData>(["home"], (current) =>
        current
          ? {
              ...current,
              threads: current.threads.filter((item) => item.id !== threadId),
            }
          : current,
      );
      if (editingThreadId === threadId) {
        setEditingThreadId(null);
      }
    },
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        aside={<div className="badge badge-green">{data.points} Green Points</div>}
        eyebrow="RepairHub Community"
        title="Learn. Connect. Repair."
        description="Admins publish tutorials and events while authenticated members create and reply to forum threads."
      />
      <section className="soft-panel rounded-[24px] flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="display text-3xl text-[var(--amber)]">160 points to Silver Tier</p>
          <p className="text-sm text-[var(--ink-60)]">Rewards accrue from completed repairs, reviews, attendance, and helpful community participation.</p>
        </div>
        <button className="rounded-full bg-[var(--amber)] px-5 py-3 text-sm font-semibold text-white" type="button">
          Redeem Points
        </button>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {data.tutorials.map((tutorial) =>
          tutorial.youtubeUrl ? (
            <a
              key={tutorial.id}
              className={`surface-card p-5 ${interactiveBlockClass}`}
              href={tutorial.youtubeUrl}
              rel="noreferrer"
              target="_blank"
            >
              <p className="mb-2 text-sm font-semibold text-[var(--ink)]">{tutorial.title}</p>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--ink-40)]">
                {tutorial.category} · {tutorial.level}
              </p>
              <p className="text-sm leading-7 text-[var(--ink-60)]">{tutorial.summary}</p>
              <p className="mt-4 text-sm font-semibold text-[var(--green)]">
                {tutorial.duration} · {tutorial.format}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--amber)]">Watch on YouTube</p>
            </a>
          ) : (
            <div key={tutorial.id} className={`surface-card p-5 ${interactiveSurfaceCardClass}`}>
              <p className="mb-2 text-sm font-semibold text-[var(--ink)]">{tutorial.title}</p>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--ink-40)]">
                {tutorial.category} · {tutorial.level}
              </p>
              <p className="text-sm leading-7 text-[var(--ink-60)]">{tutorial.summary}</p>
              <p className="mt-4 text-sm font-semibold text-[var(--green)]">
                {tutorial.duration} · {tutorial.format}
              </p>
            </div>
          ),
        )}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className={`surface-card p-6 ${interactiveSurfaceCardClass}`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="display text-3xl text-[var(--green)]">Recent Discussions</h3>
            <button
              className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--ink-40)]"
              disabled={!isCustomer}
              type="button"
              onClick={() => setIsComposerOpen((current) => !current)}
            >
              Ask a Question
            </button>
          </div>
          {isCustomer ? (
            <p className="mb-4 text-sm text-[var(--ink-60)]">Customer accounts can post questions for the community and repair network.</p>
          ) : (
            <p className="mb-4 text-sm text-[var(--ink-60)]">Sign in as a customer to start a new discussion.</p>
          )}
          {isComposerOpen ? (
            <form
              className="mb-5 space-y-4 rounded-[24px] border border-[var(--cream-3)] bg-[var(--card)] p-5"
              onSubmit={form.handleSubmit((values) => createThreadMutation.mutate(values))}
            >
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Question title
                <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("title")} />
                <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.title?.message}</span>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Category
                <select className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("category")}>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Bikes">Bikes</option>
                </select>
                <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.category?.message}</span>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Details
                <textarea
                  className="mt-2 min-h-32 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  placeholder="Describe the issue, what you have tried, and the item model if relevant."
                  {...form.register("body")}
                />
                <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.body?.message}</span>
              </label>
              {createThreadMutation.error ? <p className="text-sm text-[var(--amber)]">{createThreadMutation.error.message}</p> : null}
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={createThreadMutation.isPending} type="submit">
                  {createThreadMutation.isPending ? "Posting..." : "Post Question"}
                </button>
                <button
                  className="rounded-full border border-[var(--cream-3)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
          <div className="space-y-3">
            {data.threads.map((thread) =>
              editingThreadId === thread.id ? (
                <div key={thread.id} className={`rounded-[18px] border border-[var(--cream-3)] bg-[var(--cream-2)] p-4 ${interactiveSurfaceCardClass}`}>
                  <form className="space-y-4" onSubmit={editForm.handleSubmit((values) => updateThreadMutation.mutate(values))}>
                    <label className="block text-sm font-semibold text-[var(--ink-60)]">
                      Question title
                      <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...editForm.register("title")} />
                      <span className="mt-1 block text-xs text-[var(--amber)]">{editForm.formState.errors.title?.message}</span>
                    </label>
                    <label className="block text-sm font-semibold text-[var(--ink-60)]">
                      Category
                      <select className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...editForm.register("category")}>
                        <option value="Electronics">Electronics</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Bikes">Bikes</option>
                      </select>
                      <span className="mt-1 block text-xs text-[var(--amber)]">{editForm.formState.errors.category?.message}</span>
                    </label>
                    <label className="block text-sm font-semibold text-[var(--ink-60)]">
                      Details
                      <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...editForm.register("body")} />
                      <span className="mt-1 block text-xs text-[var(--amber)]">{editForm.formState.errors.body?.message}</span>
                    </label>
                    {updateThreadMutation.error ? <p className="text-sm text-[var(--amber)]">{updateThreadMutation.error.message}</p> : null}
                    <div className="flex flex-wrap gap-3">
                      <button className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white" disabled={updateThreadMutation.isPending} type="submit">
                        {updateThreadMutation.isPending ? "Saving..." : "Save Question"}
                      </button>
                      <button
                        className="rounded-full border border-[var(--cream-3)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-60)]"
                        type="button"
                        onClick={() => {
                          setEditingThreadId(null);
                          editForm.reset();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div key={thread.id} className={`rounded-[18px] border border-[var(--cream-3)] bg-[var(--cream-2)] p-4 ${interactiveSurfaceCardClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <Link className={`min-w-0 flex-1 ${interactiveBlockClass}`} to={`/community/thread/${thread.id}`}>
                      <p className="mb-2 text-sm font-semibold text-[var(--ink)]">{thread.title}</p>
                      <p className="text-xs text-[var(--ink-60)]">
                        {thread.author} · {thread.replies} replies · {thread.updatedAt}
                      </p>
                    </Link>
                    {thread.authorUserId === user?.id ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="rounded-full border border-[var(--cream-3)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink-60)]"
                          type="button"
                          onClick={() => {
                            setEditingThreadId(thread.id);
                            editForm.reset({
                              title: thread.title,
                              category: thread.category as AskQuestionValues["category"],
                              body: thread.body,
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-[rgba(175,99,18,0.25)] bg-[rgba(175,99,18,0.08)] px-3 py-2 text-xs font-semibold text-[var(--amber)]"
                          disabled={deleteThreadMutation.isPending}
                          type="button"
                          onClick={() => deleteThreadMutation.mutate(thread.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
        <div className={`surface-card p-6 ${interactiveSurfaceCardClass}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="display text-3xl text-[var(--green)]">Upcoming Workshops</h3>
          </div>
          <div className="space-y-3">
            {data.events.map((event) => (
              <Link key={event.id} className={`rounded-[18px] border border-[var(--cream-3)] bg-[var(--card)] p-4 ${interactiveBlockClass}`} to={`/events/${event.id}`}>
                <p className="mb-2 text-sm font-semibold text-[var(--ink)]">{event.title}</p>
                <p className="text-sm text-[var(--ink-60)]">{event.excerpt}</p>
                <p className="mt-2 text-xs text-[var(--ink-40)]">
                  {event.when} · {event.location}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
