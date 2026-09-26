// Every page in this group requires a session (checked on the server, not just hidden in the UI).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const links = [["/search", "Search"], ["/collection", "My collection"], ["/activity", "Activity"]] as const;
  return (
    <>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/search" className="font-bold text-indigo-600">MovieShelf</Link>
          {links.map(([href, label]) => <Link key={href} href={href} className="text-sm hover:underline">{label}</Link>)}
          <span className="ml-auto text-sm text-zinc-500">{user.name}</span>
          <SignOutButton />
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}
