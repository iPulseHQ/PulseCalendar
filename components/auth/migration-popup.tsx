"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Database } from "lucide-react";
import { toast } from "sonner";

export function MigrationPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [migrationData, setMigrationData] = useState<{
        calendarCount: number;
        taskCount: number;
    } | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);

    useEffect(() => {
        // Check for migration on mount
        async function checkMigration() {
            try {
                const res = await fetch("/api/auth/migration");
                const data = await res.json();

                if (data.migration) {
                    setMigrationData(data.migration);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Failed to check for migration:", err);
            }
        }

        checkMigration();
    }, []);

    const handleMigrate = async () => {
        setIsMigrating(true);
        try {
            const res = await fetch("/api/auth/migration", {
                method: "POST",
            });

            if (res.ok) {
                toast.success("Data succesvol gemigreerd!");
                setIsOpen(false);
                // Refresh page to show new data
                window.location.reload();
            } else {
                const data = await res.json();
                toast.error(data.error || "Migratie mislukt");
            }
        } catch (err) {
            toast.error("Er is een netwerkfout opgetreden");
        } finally {
            setIsMigrating(false);
        }
    };

    if (!migrationData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={isMigrating ? undefined : setIsOpen}>
            <DialogContent className="sm:max-w-[450px] border-accent/20 bg-background/95 backdrop-blur-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                        <Database className="h-6 w-6 text-blue-500" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">
                        Account migratie beschikbaar
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        We hebben bestaande data gevonden van je vorige account met dit e-mailadres.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-6 space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-pixel">Kalenders</span>
                        <span className="font-bold text-foreground">{migrationData.calendarCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-pixel">Taken</span>
                        <span className="font-bold text-foreground">{migrationData.taskCount}</span>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-md bg-amber-500/10 p-3 text-xs text-amber-500 border border-amber-500/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>
                        Door te migreren wordt alle data van je oude account gekoppeld aan je nieuwe PulseCalendar account. Je oude account wordt vervolgens verwijderd.
                    </p>
                </div>

                <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isMigrating}
                        className="w-full sm:w-auto font-pixel"
                    >
                        Later
                    </Button>
                    <Button
                        onClick={handleMigrate}
                        disabled={isMigrating}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-pixel"
                    >
                        {isMigrating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Migreren...
                            </>
                        ) : (
                            "Nu migreren"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
