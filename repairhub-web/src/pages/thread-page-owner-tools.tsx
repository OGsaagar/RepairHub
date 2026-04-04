import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { PageHeader } from "../components/shared/page-header";
import {
  createCommunityReply,
  deleteCommunityReply,
  deleteCommunityThread,
  fetchThreadById,
  type CommunityData,
  type HomePageData,
  type ThreadDetail,
  updateCommunityReply,
  updateCommunityThread,
} from "../data/mock-data";
import { useAuthStore } from "../state/auth-store";

const replySchema = z.object({
  body: z.string().min(12, "Add a bit more detail to your reply"),
});

const questionSchema = z.object({
  title: z.string().min(8, "Enter a clear question title"),
  category: z.enum(["Electronics", "Clothing", "Furniture", "Bikes"]),
  body: z.string().min(20, "Add a few more details so repairers can help"),
});

type ReplyValues = z.infer<typeof replySchema>;
type QuestionValues = z.infer<typeof questionSchema>;

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

export function ThreadPageOwnerTools() {
  const { threadId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canReply = isAuthenticated && role !== "guest" && user;
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const form = useForm<ReplyValues>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      body: "",
    },
  });
  const questionForm = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      category: "Electronics",
      body: "",
    },
  });
  const replyEditForm = useForm<ReplyValues>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      body: "",
    },
  });

  const { data } = useQuery<ThreadDetail | undefined>({
    queryKey: ["thread", threadId],
    queryFn: () => fetchThreadById(threadId),
  });

  const createReplyMutation = useMutation({
    mutationFn: (values: ReplyValues) =>
      createCommunityReply(threadId, {
        body: values.body,
        author: getAuthorName(user?.first_name, user?.last_name, user?.email),
        authorUserId: user?.id ?? "",
        authorRole: role === "guest" ? "customer" : role,
      }),
    onSuccess: (thread) => {
      syncThreadIntoCaches(queryClient, thread);
      form.reset();
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: (values: QuestionValues) =>
      updateCommunityThread(threadId, {
        ...values,
        authorUserId: user?.id ?? "",
      }),
    onSuccess: (thread) => {
      syncThreadIntoCaches(queryClient, thread);
      setIsEditingQuestion(false);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: () => deleteCommunityThread(threadId, user?.id ?? ""),
    onSuccess: () => {
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
      navigate("/community");
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: (values: ReplyValues) => updateCommunityReply(threadId, editingReplyId ?? "", { ...values, authorUserId: user?.id ?? "" }),
    onSuccess: (thread) => {
      syncThreadIntoCaches(queryClient, thread);
      setEditingReplyId(null);
      replyEditForm.reset();
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: string) => deleteCommunityReply(threadId, replyId, user?.id ?? ""),
    onSuccess: (thread) => {
      syncThreadIntoCaches(queryClient, thread);
      if (editingReplyId && !thread.replyItems.find((reply) => reply.id === editingReplyId)) {
        setEditingReplyId(null);
      }
    },
  });

  if (!data) {
    return null;
  }

  const isQuestionOwner = data.authorUserId === user?.id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow={data.category} title={data.title} description={`${data.author} · ${data.replies} replies · ${data.updatedAt}`} />
      <div className="surface-card space-y-6 p-8">
        <div className="rounded-[24px] bg-[var(--cream-2)] p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Original question</p>
            {isQuestionOwner && !isEditingQuestion ? (
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-[var(--cream-3)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink-60)]"
                  type="button"
                  onClick={() => {
                    questionForm.reset({
                      title: data.title,
                      category: data.category as QuestionValues["category"],
                      body: data.body,
                    });
                    setIsEditingQuestion(true);
                  }}
                >
                  Edit Question
                </button>
                <button
                  className="rounded-full border border-[rgba(175,99,18,0.25)] bg-[rgba(175,99,18,0.08)] px-4 py-2 text-xs font-semibold text-[var(--amber)]"
                  disabled={deleteQuestionMutation.isPending}
                  type="button"
                  onClick={() => deleteQuestionMutation.mutate()}
                >
                  Delete Question
                </button>
              </div>
            ) : null}
          </div>
          {isEditingQuestion ? (
            <form className="space-y-4" onSubmit={questionForm.handleSubmit((values) => updateQuestionMutation.mutate(values))}>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Question title
                <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...questionForm.register("title")} />
                <span className="mt-1 block text-xs text-[var(--amber)]">{questionForm.formState.errors.title?.message}</span>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Category
                <select className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...questionForm.register("category")}>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Bikes">Bikes</option>
                </select>
                <span className="mt-1 block text-xs text-[var(--amber)]">{questionForm.formState.errors.category?.message}</span>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Details
                <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...questionForm.register("body")} />
                <span className="mt-1 block text-xs text-[var(--amber)]">{questionForm.formState.errors.body?.message}</span>
              </label>
              {updateQuestionMutation.error ? <p className="text-sm text-[var(--amber)]">{updateQuestionMutation.error.message}</p> : null}
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={updateQuestionMutation.isPending} type="submit">
                  {updateQuestionMutation.isPending ? "Saving..." : "Save Question"}
                </button>
                <button
                  className="rounded-full border border-[var(--cream-3)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
                  type="button"
                  onClick={() => {
                    setIsEditingQuestion(false);
                    questionForm.reset();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-base leading-8 text-[var(--ink-60)]">{data.body}</p>
          )}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="display text-3xl text-[var(--green)]">Replies</h2>
            <div className="rounded-full bg-[var(--cream-2)] px-4 py-2 text-sm font-semibold text-[var(--ink-60)]">
              {data.replies} total
            </div>
          </div>

          {canReply ? (
            <form
              className="space-y-4 rounded-[24px] border border-[var(--cream-3)] bg-[var(--card)] p-5"
              onSubmit={form.handleSubmit((values) => createReplyMutation.mutate(values))}
            >
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Add your reply
                <textarea
                  className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  placeholder="Share what you would check, recommend, or avoid."
                  {...form.register("body")}
                />
                <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.body?.message}</span>
              </label>
              {createReplyMutation.error ? <p className="text-sm text-[var(--amber)]">{createReplyMutation.error.message}</p> : null}
              <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={createReplyMutation.isPending} type="submit">
                {createReplyMutation.isPending ? "Posting reply..." : "Post Reply"}
              </button>
            </form>
          ) : (
            <div className="rounded-[24px] border border-[var(--cream-3)] bg-[var(--card)] p-5 text-sm text-[var(--ink-60)]">
              Sign in to reply to this question.
              <div className="mt-3">
                <Link className="rounded-full bg-[var(--green)] px-4 py-2 font-semibold text-white" to="/auth">
                  Go to Sign In
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data.replyItems.length ? (
              data.replyItems.map((reply) => {
                const isReplyOwner = reply.authorUserId === user?.id;
                return (
                  <article key={reply.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--cream-2)] p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-[var(--ink)]">{reply.author}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-40)]">
                          {reply.authorRole}
                        </span>
                        <span className="text-[var(--ink-40)]">{reply.postedAt}</span>
                      </div>
                      {isReplyOwner && editingReplyId !== reply.id ? (
                        <div className="flex gap-2">
                          <button
                            className="rounded-full border border-[var(--cream-3)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink-60)]"
                            type="button"
                            onClick={() => {
                              setEditingReplyId(reply.id);
                              replyEditForm.reset({ body: reply.body });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-full border border-[rgba(175,99,18,0.25)] bg-[rgba(175,99,18,0.08)] px-3 py-2 text-xs font-semibold text-[var(--amber)]"
                            disabled={deleteReplyMutation.isPending}
                            type="button"
                            onClick={() => deleteReplyMutation.mutate(reply.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {editingReplyId === reply.id ? (
                      <form className="space-y-4" onSubmit={replyEditForm.handleSubmit((values) => updateReplyMutation.mutate(values))}>
                        <label className="block text-sm font-semibold text-[var(--ink-60)]">
                          Edit your reply
                          <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...replyEditForm.register("body")} />
                          <span className="mt-1 block text-xs text-[var(--amber)]">{replyEditForm.formState.errors.body?.message}</span>
                        </label>
                        {updateReplyMutation.error ? <p className="text-sm text-[var(--amber)]">{updateReplyMutation.error.message}</p> : null}
                        <div className="flex flex-wrap gap-3">
                          <button className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white" disabled={updateReplyMutation.isPending} type="submit">
                            {updateReplyMutation.isPending ? "Saving..." : "Save Reply"}
                          </button>
                          <button
                            className="rounded-full border border-[var(--cream-3)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-60)]"
                            type="button"
                            onClick={() => {
                              setEditingReplyId(null);
                              replyEditForm.reset();
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm leading-7 text-[var(--ink-60)]">{reply.body}</p>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="rounded-[20px] bg-[var(--cream-2)] p-5 text-sm text-[var(--ink-60)]">
                No replies yet. Be the first to help with this repair question.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
