"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "./ui";

export function SignOutButton() {
  const router = useRouter();
  return <Button variant="secondary" onClick={async () => { await signOut(); router.push("/sign-in"); router.refresh(); }}>Sign out</Button>;
}
