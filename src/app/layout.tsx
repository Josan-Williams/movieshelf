import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MovieShelf",
  description: "Search movies by director and genre, keep a collection and rate what you watch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-white focus:p-2 focus:text-black">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
