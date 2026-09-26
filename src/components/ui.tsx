// Small shared UI primitives (Tailwind only).
import type { ComponentProps } from "react";

export const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function Button({ className = "", variant = "primary", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
    danger: "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950",
  }[variant];
  return <button className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${className}`} {...props} />;
}

export function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  const cls = tone === "error"
    ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    : "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Poster({ path, title, size = "w185" }: { path: string | null; title: string; size?: "w185" | "w342" }) {
  const w = size === "w185" ? 92 : 185;
  return path
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={`https://image.tmdb.org/t/p/${size}${path}`} alt={`Poster for ${title}`} width={w} height={w * 1.5} loading="lazy" className="rounded-md bg-zinc-200 object-cover" style={{ width: w, height: w * 1.5 }} />
    : <div style={{ width: w, height: w * 1.5 }} className="flex items-center justify-center rounded-md bg-zinc-200 p-2 text-center text-xs text-zinc-500 dark:bg-zinc-800" aria-label={`No poster for ${title}`}>No poster</div>;
}

export const year = (d: string | null) => (d ? d.slice(0, 4) : "Unknown year");

/** Read the API's uniform error shape. */
export async function apiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const fields = body?.error?.fields ? Object.values(body.error.fields as Record<string, string[]>).flat().join(" ") : "";
    return [body?.error?.message, fields].filter(Boolean).join(" ") || `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}
