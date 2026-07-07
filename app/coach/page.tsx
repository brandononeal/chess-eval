import { redirect } from "next/navigation";

// The coach is the home page now; keep /coach working for old links.
export default function CoachRedirect() {
  redirect("/");
}
