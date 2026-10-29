import type { Metadata } from "next";
import { ProfileEditor } from "./profile-editor";

export const metadata: Metadata = {
  title: "Profile — CVPolish",
  description: "Your master CV data — the source for every tailored CV.",
};

export default function ProfilePage() {
  return <ProfileEditor />;
}
