import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export const metadata: Metadata = {
  title: "OpenCalendars - Al je kalenders op één plek",
  description: "OpenCalendars brengt al je Google Calendar en iCloud events samen in één overzichtelijke kalender. Gratis, open source en met desktop app.",
  alternates: {
    canonical: "/",
  },
};

export default async function RootPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/welcome");
  }
}
