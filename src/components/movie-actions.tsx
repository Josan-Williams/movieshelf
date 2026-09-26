"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, apiError, inputCls } from "./ui";

export function MovieActions({ tmdbId, inCollection, myRating }: {
  tmdbId: number; inCollection: boolean; myRating: { value: number; review: string | null } | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function call(url: string, init: RequestInit, ok: string) {
    setPending(true); setError(null); setNotice(null);
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } }).catch(() => null);
    setPending(false);
    if (!res) return setError("Network error. Please try again.");
    if (!res.ok) return setError(await apiError(res));
    setNotice(ok);
    router.refresh();
  }

  function onRate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    call(`/api/ratings/${tmdbId}`, {
      method: "PUT",
      body: JSON.stringify({ rating: Number(f.get("rating")), review: String(f.get("review") ?? "") || null }),
    }, "Rating saved.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        {inCollection
          ? <Button variant="danger" disabled={pending} onClick={() => call(`/api/collection/${tmdbId}`, { method: "DELETE" }, "Removed from your collection.")}>Remove from collection</Button>
          : <Button disabled={pending} onClick={() => call(`/api/collection/${tmdbId}`, { method: "PUT" }, "Added to your collection.")}>Add to collection</Button>}
      </div>
      <form onSubmit={onRate} className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-semibold">{myRating ? "Update your rating" : "Rate this movie"}</h2>
        <label className="flex flex-col gap-1 text-sm">Rating (1 to 10)
          <select name="rating" required defaultValue={myRating?.value ?? ""} className={inputCls}>
            <option value="" disabled>Choose a rating</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Review (optional)
          <textarea name="review" maxLength={2000} rows={3} defaultValue={myRating?.review ?? ""} className={inputCls} />
        </label>
        <Button type="submit" disabled={pending}>Save rating</Button>
      </form>
      <div aria-live="polite">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}
      </div>
    </div>
  );
}