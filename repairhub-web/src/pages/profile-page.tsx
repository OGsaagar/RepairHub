import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "../components/shared/page-header";
import { api } from "../lib/api/client";
import { useAuthStore } from "../state/auth-store";

const profileSchema = z.object({
  first_name: z.string().trim().min(2, "Enter your first name"),
  last_name: z.string().trim().min(2, "Enter your last name"),
  email: z.string().trim().email("Enter a valid email address"),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.getCurrentProfile,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    form.reset({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    });
  }, [data, form]);

  const updateProfileMutation = useMutation({
    mutationFn: (values: ProfileValues) => api.updateMyProfile(values),
    onSuccess: (updatedUser) => {
      setSuccessMessage("Profile updated successfully.");
      updateUser(updatedUser);
      queryClient.setQueryData(["auth", "me"], updatedUser);
    },
  });

  if (isLoading && !data) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Profile" title="Your details" description="Loading your account details." />
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Profile" title="Your details" description="We could not load your account details right now." />
        <div className="surface-card p-8">
          <p className="text-sm text-[var(--amber)]">{error.message}</p>
        </div>
      </div>
    );
  }

  const profile = data ?? user;

  if (!profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        aside={
          <div className="rounded-[24px] border border-[var(--cream-3)] bg-[var(--card)] px-5 py-4 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Access</p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{profile.role}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-40)]">{profile.profile_status}</p>
          </div>
        }
        eyebrow="Profile"
        title={`${profile.first_name || profile.email}'s account`}
        description="Review your account details and update the information linked to your RepairHub profile."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          className="surface-card space-y-5 p-8"
          onSubmit={form.handleSubmit((values) => {
            setSuccessMessage(null);
            updateProfileMutation.mutate(values);
          })}
        >
          <h2 className="display text-3xl text-[var(--green)]">Edit your details</h2>
          <label className="block text-sm font-semibold text-[var(--ink-60)]">
            First name
            <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("first_name")} />
            <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.first_name?.message}</span>
          </label>
          <label className="block text-sm font-semibold text-[var(--ink-60)]">
            Last name
            <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("last_name")} />
            <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.last_name?.message}</span>
          </label>
          <label className="block text-sm font-semibold text-[var(--ink-60)]">
            Email
            <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("email")} />
            <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.email?.message}</span>
          </label>
          {updateProfileMutation.error ? <p className="text-sm text-[var(--amber)]">{updateProfileMutation.error.message}</p> : null}
          {successMessage ? <p className="text-sm font-semibold text-[var(--green)]">{successMessage}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={updateProfileMutation.isPending} type="submit">
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="rounded-full border border-[var(--cream-3)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
              type="button"
              onClick={() =>
                form.reset({
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  email: profile.email,
                })
              }
            >
              Reset
            </button>
          </div>
        </form>

        <div className="surface-card space-y-5 p-8">
          <h2 className="display text-3xl text-[var(--green)]">Account overview</h2>
          <div className="rounded-[24px] bg-[var(--cream-2)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-40)]">Signed-in account</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{profile.email}</p>
            <p className="mt-1 text-sm text-[var(--ink-60)]">
              {profile.first_name} {profile.last_name}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-40)]">Role</p>
              <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{profile.role}</p>
            </div>
            <div className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-40)]">Profile status</p>
              <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{profile.profile_status}</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-[var(--ink-60)]">
            Role and approval status are managed by the platform. If those need to change, contact the RepairHub admin team.
          </p>
        </div>
      </div>
    </div>
  );
}
