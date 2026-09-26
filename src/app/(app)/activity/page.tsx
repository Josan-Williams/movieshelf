import Link from "next/link";
import { db } from "@/db";
import { getCurrentUser } from "@/server/session";
import { listActivity } from "@/server/activity";
import { PageQuery } from "@/server/validation";

export const metadata = { title: "Activity - MovieShelf" };

const LABELS: Record<string, string> = {
  "auth.sign_up": "Created account", "auth.sign_in": "Signed in", "auth.sign_out": "Signed out",
  "auth.sign_in_failed": "Failed sign-in", "collection.add": "Added to collection",
  "collection.remove": "Removed from collection", "rating.create": "Rated a movie",
  "rating.update": "Updated a rating", "ai.search": "AI search",
};

function describe(details: unknown): string {
  const d = (details ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (d.title) parts.push(String(d.title));
  if (d.value) parts.push(`${d.value}/10`);
  if (d.source) parts.push(`${d.source === "ai" ? "AI" : "fallback"}: ${[d.director, d.genre].filter(Boolean).join(", ") || "no criteria"}`);
  if (d.ip) parts.push(`IP ${d.ip}`);
  return parts.join(" - ");
}

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const user = (await getCurrentUser())!;
  const { page } = PageQuery.catch({ page: 1 }).parse(await searchParams);
  const log = await listActivity(db, user.id, page);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Your activity</h1>
      <p className="text-sm text-zinc-500">A read-only record of your actions. Times are shown in UTC.</p>
      {log.items.length === 0 ? <p className="text-sm">No activity yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your audit log</caption>
            <thead><tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th scope="col" className="py-2 pr-4">When (UTC)</th><th scope="col" className="py-2 pr-4">Action</th><th scope="col" className="py-2">Details</th>
            </tr></thead>
            <tbody>
              {log.items.map((i) => (
                <tr key={i.id} className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">{i.timestampUtc.toISOString().replace("T", " ").slice(0, 19)}</td>
                  <td className="py-2 pr-4">{LABELS[i.action] ?? i.action}</td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{describe(i.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {log.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex gap-4 text-sm">
          {page > 1 && <Link className="underline" href={`/activity?page=${page - 1}`}>Newer</Link>}
          <span>Page {page} of {log.totalPages}</span>
          {page < log.totalPages && <Link className="underline" href={`/activity?page=${page + 1}`}>Older</Link>}
        </nav>
      )}
    </div>
  );
}
