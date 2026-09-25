// Mounts Better Auth's endpoints at /api/auth/* (sign-up, sign-in, sign-out, get-session).
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
