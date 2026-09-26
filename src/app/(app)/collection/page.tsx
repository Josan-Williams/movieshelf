import Link from "next/link";
import { db } from "@/db";
import { getCurrentUser } from "@/server/session";
import { listCollection } from "@/server/collection";
import { Poster, year } from "@/components/ui";

export const metadata = { title: "My collection - MovieShelf" };

export default async function CollectionPage() {
  const user = (await getCurrentUser())!;
  const items = await listCollection(db, user.id);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">My collection <span className="text-base font-normal text-zinc-500">({items.length})</span></h1>
      {items.length === 0 ? (
        <p className="text-sm">Your collection is empty. <Link href="/search" className="text-indigo-600 underline">Search for movies</Link> to add some.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <li key={m.tmdbId}>
              <Link href={`/movies/${m.tmdbId}`} className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3 hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900">
                <Poster path={m.posterPath} title={m.title} />
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-sm text-zinc-500">{year(m.releaseDate)}</p>
                  <p className="text-sm">{m.myRating ? `Your rating: ${m.myRating}/10` : "Not rated"}</p>
                  <p className="text-xs text-zinc-500">Added {m.addedAt.toISOString().slice(0, 10)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
