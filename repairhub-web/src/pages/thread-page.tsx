import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { PageHeader } from "../components/shared/page-header";
import {
  createCommunityReply,
  fetchThreadById,
  type CommunityData,
  type HomePageData,
  type ThreadDetail,
} from "../data/mock-data";
import { useAuthStore } from "../state/auth-store";

const replySchema = z.object({
  body: z.string().min(12, "Add a bit more detail to your reply"),
});

type ReplyValues = z.infer<typeof replySchema>;

function getAuthorName(firstName: string | undefined, lastName: string | undefined, email: string | undefined) {
  if (firstName && lastName) {
    return `${firstName} ${lastName.charAt(0)}.`;
  }

  if (firstName) {
    return firstName;
  }

  return email ?? "RepairHub Member";
}

export function ThreadPage() {
  const { threadId = "" } = useParams();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canReply = isAuthenticated && role !== "guest" && user;
  const form = useForm<ReplyValues>({
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
        authorRole: role === "guest" ? "customer" : role,
      }),
    onSuccess: (thread) => {
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
      form.reset();
    },
  });

  if (!data) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow={data.category} title={data.title} description={`${data.author} · ${data.replies} replies · ${data.updatedAt}`} />
      <div className="surface-card space-y-6 p-8">
        <div className="rounded-[24px] bg-[var(--cream-2)] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Original question</p>
          <p className="text-base leading-8 text-[var(--ink-60)]">{data.body}</p>
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
              <button
                className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
                disabled={createReplyMutation.isPending}
                type="submit"
              >
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
              data.replyItems.map((reply) => (
                <article key={reply.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--cream-2)] p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{reply.author}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-40)]">
                      {reply.authorRole}
                    </span>
                    <span className="text-[var(--ink-40)]">{reply.postedAt}</span>
                  </div>
                  <p className="text-sm leading-7 text-[var(--ink-60)]">{reply.body}</p>
                </article>
              ))
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
