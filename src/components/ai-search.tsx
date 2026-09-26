"use client";
import { useState } from "react";
import type { MovieSummary } from "@/server/tmdb";
import { MovieGrid } from "./movie-grid";
import { Alert, Button, apiError, inputCls } from "./ui";

type AiResponse = {
  source: "ai" | "fallback"; fallbackReason?: string;
  criteria: { director: string | null; genre: { name: string } | null };
  results: MovieSummary[]; totalResults: number; message?: string;
};

export function AiSearch() {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true); setError(null);
    const res = await fetch("/api/ai/search", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }),
    }).catch(() => null);
    setPending(false);
    if (!res) return setError("Network error. Please try again.");
    if (!res.ok) return setError(await apiError(res));
    setData(await res.json());
  }

  return (
    <section aria-labelledby="ai-h" className="flex flex-col gap-3">
      <h2 id="ai-h" className="text-lg font-semibold">Describe what you want</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ai-q" className="sr-only">Natural-language search</label>
        <input id="ai-q" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200} minLength={2} required
          placeholder='e.g. "scary movies by Jordan Peele"' className={inputCls} />
        <Button type="submit" disabled={pending}>{pending ? "Thinking..." : "Search"}</Button>
      </form>
      {error && <Alert>{error}</Alert>}
      {data && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <Alert tone="info">
            {data.source === "ai" ? "AI understood: " : "Basic search (AI unavailable) understood: "}
            {data.criteria.director && <>director <strong>{data.criteria.director}</strong></>}
            {data.criteria.director && data.criteria.genre && ", "}
            {data.criteria.genre && <>genre <strong>{data.criteria.genre.name}</strong></>}
            {!data.criteria.director && !data.criteria.genre && "nothing searchable"}
            {" - "}{data.totalResults} result(s).
          </Alert>
          {data.message ? <p className="text-sm">{data.message}</p> : <MovieGrid movies={data.results} />}
        </div>
      )}
    </section>
  );
}
