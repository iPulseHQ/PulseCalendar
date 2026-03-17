"use client";

import { UserButton } from "@ipulsehq/auth-ui";
import { useSession, signOut } from "next-auth/react";

export function UserButtonWrapper() {
  const { data: session } = useSession();

  return (
    <UserButton
      user={session?.user ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      } : undefined}
      onSignOut={() => signOut({ callbackUrl: "/welcome" })}
      manageAccountUrl="https://ipulse.one/account"
    />
  );
}
