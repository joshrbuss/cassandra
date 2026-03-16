import { redirect } from "next/navigation";

export default function OnboardingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // Preserve ref param if present
  return redirect("/connect");
}
