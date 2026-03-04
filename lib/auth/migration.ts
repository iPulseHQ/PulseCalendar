import { db } from "@/lib/db";
import { user, calendarAccounts, taskProviders, userSettings } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { getUser } from "./server";

/**
 * Checks if the current authenticated user has a "legacy" account
 * from the previous Supabase/Better Auth setup with the same email.
 */
export async function checkMigrationAvailability() {
    const clerkUser = await getUser();
    if (!clerkUser || !clerkUser.email) return null;

    // Search for a user with the same email but a DIFFERENT id
    // Clerk IDs start with 'user_', legacy IDs (UUIDs) don't.
    const legacyUsers = await db
        .select()
        .from(user)
        .where(
            and(
                eq(user.email, clerkUser.email),
                ne(user.id, clerkUser.id)
            )
        );

    if (legacyUsers.length === 0) return null;

    // Check if the legacy user actually has data to migrate
    const legacyUserId = legacyUsers[0].id;

    const [calendarCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(calendarAccounts)
        .where(eq(calendarAccounts.userId, legacyUserId));

    const [taskCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(taskProviders)
        .where(eq(taskProviders.userId, legacyUserId));

    if (Number(calendarCount.count) === 0 && Number(taskCount.count) === 0) {
        return null;
    }

    return {
        legacyUserId,
        email: clerkUser.email,
        calendarCount: Number(calendarCount.count),
        taskCount: Number(taskCount.count)
    };
}

/**
 * Migrates data from a legacy user ID to the current Clerk user ID.
 *
 * Two FK/unique constraints make this tricky:
 * - calendar_accounts.user_id → user.id  (can't update FK before Clerk user exists)
 * - user.email unique index              (can't insert Clerk user if legacy user has same email)
 *
 * Strategy:
 * 1. If Clerk user already exists in DB  → skip insert, go straight to FK updates.
 * 2. If Clerk user does NOT exist        → temporarily rename legacy user email,
 *    insert Clerk user, update FKs, delete legacy user.
 */
export async function migrateLegacyData(legacyUserId: string) {
    const clerkUser = await getUser();
    if (!clerkUser) throw new Error("Not authenticated");

    const clerkUserId = clerkUser.id;
    const clerkEmail = clerkUser.email || "";
    const clerkName = clerkUser.user_metadata?.name || clerkEmail;

    return await db.transaction(async (tx) => {
        // 0. Check if the Clerk user row already exists in the DB
        const [existingClerkUser] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, clerkUserId));

        if (!existingClerkUser) {
            // Temporarily rename the legacy user's email so we can insert
            // the Clerk user without hitting the unique email constraint.
            await tx
                .update(user)
                .set({ email: `__migrating__${legacyUserId}` })
                .where(eq(user.id, legacyUserId));

            // Insert the Clerk user now that the email slot is free
            await tx.insert(user).values({
                id: clerkUserId,
                name: clerkName,
                email: clerkEmail,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // 1. Move calendar accounts to Clerk user
        await tx
            .update(calendarAccounts)
            .set({ userId: clerkUserId, updatedAt: new Date() })
            .where(eq(calendarAccounts.userId, legacyUserId));

        // 2. Move task providers to Clerk user
        await tx
            .update(taskProviders)
            .set({ userId: clerkUserId, updatedAt: new Date() })
            .where(eq(taskProviders.userId, legacyUserId));

        // 3. Move user settings only if the Clerk user doesn't already have them
        const [existingSettings] = await tx
            .select({ userId: userSettings.userId })
            .from(userSettings)
            .where(eq(userSettings.userId, clerkUserId));

        if (!existingSettings) {
            await tx
                .update(userSettings)
                .set({ userId: clerkUserId, updatedAt: new Date() })
                .where(eq(userSettings.userId, legacyUserId));
        }

        // 4. Delete legacy user — all FK references have been moved to clerkUserId
        await tx.delete(user).where(eq(user.id, legacyUserId));

        return { success: true };
    });
}
