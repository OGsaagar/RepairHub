import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { PageHeader } from "../components/shared/page-header";
import { api } from "../lib/api/client";
import { useAuthStore } from "../state/auth-store";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["customer", "repairer", "admin"]),
});

const registerSchema = z
  .object({
    first_name: z.string().min(2, "Enter your first name"),
    last_name: z.string().min(2, "Enter your last name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
    role: z.enum(["customer", "repairer"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type AuthMode = "login" | "register";
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function getLandingPath(role: "customer" | "repairer" | "admin") {
  switch (role) {
    case "customer":
      return "/client";
    case "repairer":
      return "/dashboard";
    case "admin":
      return "/admin";
  }
}

function formatRoleLabel(role: "customer" | "repairer" | "admin") {
  if (role === "customer") {
    return "customer/client";
  }

  return role;
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "customer",
    },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "customer",
    },
  });

  const selectedLoginRole = useWatch({
    control: loginForm.control,
    name: "role",
  });
  const selectedRegisterRole = useWatch({
    control: registerForm.control,
    name: "role",
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const session = await api.login({
        email: values.email,
        password: values.password,
      });

      if (session.user.role !== values.role) {
        throw new Error(`This account is registered as ${formatRoleLabel(session.user.role)}.`);
      }

      return session;
    },
    onSuccess: (session) => {
      setSession(session);
      navigate(getLandingPath(session.user.role));
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterValues) => {
      await api.register({
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
      });

      return api.login({
        email: values.email,
        password: values.password,
      });
    },
    onSuccess: (session) => {
      setSession(session);
      navigate(getLandingPath(session.user.role));
    },
  });

  if (isAuthenticated && user) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Authenticated"
          title={`Signed in as ${user.first_name || user.email}`}
          description="Your session is active. Continue to the workspace assigned to your account type, or log out to switch accounts."
        />
        <div className="surface-card space-y-5 p-8">
          <div className="rounded-[24px] bg-[var(--cream-2)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-40)]">Account</p>
            <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{user.email}</p>
            <p className="mt-1 text-sm text-[var(--ink-60)]">
              Role: {formatRoleLabel(user.role)} · Profile status: {user.profile_status}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" to={getLandingPath(user.role)}>
              Continue
            </Link>
            <button
              className="rounded-full border border-[var(--cream-3)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
              type="button"
              onClick={clearSession}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Auth"
        title="Choose your account path."
        description="Customers can create requests and manage repairs, repairers can manage jobs and quotes, and admins can sign in to the internal operations area."
      />
      <div className="mb-6 inline-flex rounded-full border border-[var(--cream-3)] bg-[var(--card)] p-1">
        {(["login", "register"] as const).map((option) => (
          <button
            key={option}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              mode === option ? "bg-[var(--green)] text-white" : "text-[var(--ink-60)]"
            }`}
            type="button"
            onClick={() => setMode(option)}
          >
            {option === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form className="surface-card space-y-5 p-8" onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Email
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...loginForm.register("email")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{loginForm.formState.errors.email?.message}</span>
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Password
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" type="password" {...loginForm.register("password")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{loginForm.formState.errors.password?.message}</span>
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-[var(--ink-60)]">Sign in as</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {(["customer", "repairer", "admin"] as const).map((role) => (
                <label
                  key={role}
                  className={`rounded-[24px] border p-4 ${
                    selectedLoginRole === role
                      ? "border-[var(--green)] bg-[rgba(31,94,44,0.08)]"
                      : "border-[var(--cream-3)] bg-[var(--card)]"
                  }`}
                >
                  <input className="sr-only" type="radio" value={role} {...loginForm.register("role")} />
                  <p className="font-semibold text-[var(--ink)]">{formatRoleLabel(role)}</p>
                  <p className="mt-1 text-sm text-[var(--ink-60)]">
                    {role === "customer" && "Book and track repairs."}
                    {role === "repairer" && "Manage jobs and pricing."}
                    {role === "admin" && "Access internal ops controls."}
                  </p>
                </label>
              ))}
            </div>
            <span className="mt-1 block text-xs text-[var(--amber)]">{loginForm.formState.errors.role?.message}</span>
          </fieldset>
          {loginMutation.error ? <p className="text-sm text-[var(--amber)]">{loginMutation.error.message}</p> : null}
          <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : (
        <form className="surface-card space-y-5 p-8" onSubmit={registerForm.handleSubmit((values) => registerMutation.mutate(values))}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              First name
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...registerForm.register("first_name")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{registerForm.formState.errors.first_name?.message}</span>
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Last name
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...registerForm.register("last_name")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{registerForm.formState.errors.last_name?.message}</span>
            </label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Email
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...registerForm.register("email")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{registerForm.formState.errors.email?.message}</span>
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Password
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" type="password" {...registerForm.register("password")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{registerForm.formState.errors.password?.message}</span>
            </label>
          </div>
          <label className="block text-sm font-semibold text-[var(--ink-60)]">
            Confirm password
            <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" type="password" {...registerForm.register("confirmPassword")} />
            <span className="mt-1 block text-xs text-[var(--amber)]">{registerForm.formState.errors.confirmPassword?.message}</span>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-[var(--ink-60)]">Create account as</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {(["customer", "repairer"] as const).map((role) => (
                <label
                  key={role}
                  className={`rounded-[24px] border p-4 ${
                    selectedRegisterRole === role
                      ? "border-[var(--green)] bg-[rgba(31,94,44,0.08)]"
                      : "border-[var(--cream-3)] bg-[var(--card)]"
                  }`}
                >
                  <input className="sr-only" type="radio" value={role} {...registerForm.register("role")} />
                  <p className="font-semibold text-[var(--ink)]">{formatRoleLabel(role)}</p>
                  <p className="mt-1 text-sm text-[var(--ink-60)]">
                    {role === "customer" ? "Request repairs and manage bookings." : "Apply to accept repair work and publish services."}
                  </p>
                </label>
              ))}
            </div>
            <span className="mt-1 block text-xs text-[var(--amber)]">{registerForm.formState.errors.role?.message}</span>
          </fieldset>
          <p className="rounded-[24px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
            Admin accounts are not created from the public registration flow.
          </p>
          {registerMutation.error ? <p className="text-sm text-[var(--amber)]">{registerMutation.error.message}</p> : null}
          <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={registerMutation.isPending} type="submit">
            {registerMutation.isPending ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
