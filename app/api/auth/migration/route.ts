import { NextRequest, NextResponse } from "next/server";
import { checkMigrationAvailability, migrateLegacyData } from "@/lib/auth/migration";
import { getUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
    try {
        const migration = await checkMigrationAvailability();
        return NextResponse.json({ migration });
    } catch (error) {
        console.error("Migration check error:", error);
        return NextResponse.json({ error: "Failed to check migration" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const migration = await checkMigrationAvailability();
        if (!migration) {
            return NextResponse.json({ error: "No migration available" }, { status: 400 });
        }

        await migrateLegacyData(migration.legacyUserId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Migration error:", error);
        return NextResponse.json({ error: "Migration failed" }, { status: 500 });
    }
}
