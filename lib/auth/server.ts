import { currentUser, auth } from "@clerk/nextjs/server";

export async function getUser() {
  const user = await currentUser();
  if (!user) return null;

  // Return compatible user object if needed
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    user_metadata: {
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
      avatar_url: user.imageUrl || null,
    }
  };
}

export async function getSession() {
  const { sessionId, userId } = await auth();
  if (!userId) return null;

  return {
    id: sessionId,
    user: { id: userId }
  };
}
