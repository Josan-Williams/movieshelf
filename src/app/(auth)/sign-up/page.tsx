import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { AuthForm } from "@/components/auth-form";

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/search");
  return <AuthForm mode="sign-up" />;
}
