"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Alert, Button, inputCls } from "./ui";

const noopSubscribe = () => () => {};

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Until React has hydrated, a submit would be a native form GET that puts the password in the URL.
  // false during server render and before hydration, true once React is in control.
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const { error } = mode === "sign-in"
      ? await signIn.email({ email, password })
      : await signUp.email({ email, password, name: String(f.get("name")) });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Please wait a minute and try again." : error.message ?? "Something went wrong.");
      return;
    }
    router.push("/search");
    router.refresh();
  }

  const isSignUp = mode === "sign-up";
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <p className="text-sm font-semibold text-indigo-600">MovieShelf</p>
        <h1 className="text-2xl font-bold">{isSignUp ? "Create an account" : "Sign in"}</h1>
      </div>
      {!isSignUp && (
        <Alert tone="info">Evaluators: demo account <strong>demo@example.com</strong> / <strong>correct-horse-9</strong></Alert>
      )}
      <form onSubmit={onSubmit} method="post" action="#" className="flex flex-col gap-4">
        {isSignUp && (
          <label className="flex flex-col gap-1 text-sm">Name
            <input name="name" required maxLength={100} autoComplete="name" className={inputCls} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">Email
          <input name="email" type="email" required autoComplete="email" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">Password
          <input name="password" type="password" required minLength={8} maxLength={128}
            autoComplete={isSignUp ? "new-password" : "current-password"} className={inputCls} aria-describedby="pw-hint" />
          <span id="pw-hint" className="text-xs text-zinc-500">At least 8 characters.</span>
        </label>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={pending || !ready}>{pending ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="text-sm">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link className="text-indigo-600 underline" href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link>
      </p>
    </main>
  );
}
