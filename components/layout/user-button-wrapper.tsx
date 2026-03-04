"use client";

import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export function UserButtonWrapper() {
  return (
    <UserButton
      appearance={{
        baseTheme: dark,
        elements: {
          userButtonAvatarBox: "h-10 w-10",
        }
      }}
      userProfileMode="navigation"
      userProfileUrl="/settings?tab=account"
    />
  );
}
