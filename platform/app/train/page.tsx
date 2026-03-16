/**
 * /train — Legacy redirect to /home.
 * All training is now at /unlearned.
 */

import { redirect } from "next/navigation";

export default function TrainPage() {
  redirect("/home");
}
