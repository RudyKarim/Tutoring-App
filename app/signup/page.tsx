import { Suspense } from "react";
import { AuthForm } from "@/components/ui/AuthForm";
export const metadata = { title: "Create account" };
export default function SignupPage() {
  return <Suspense><AuthForm mode="signup" /></Suspense>;
}
