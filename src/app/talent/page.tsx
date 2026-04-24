import { redirect } from "next/navigation";

export default function TalentRedirectPage() {
  redirect("/explore?tab=people");
}
