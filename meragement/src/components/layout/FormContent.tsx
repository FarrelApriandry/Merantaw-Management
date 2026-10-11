// src/components/layout/FormContent.tsx — P0: hanya admin boleh buka form create user/team/project.
import { useState, type JSX } from "react";
import AddUserForm from "@/components/forms/AddUserForm";
import AddTeamForm from "@/components/forms/AddTeamForm";
import AddProjectForm from "@/components/forms/AddProjectForm";
import { Button } from "@/components/ui/button";
import { AdminProtector } from "@/components/auth/PagesProtector";

type ActiveForm = "user" | "team" | "project";

export default function FormContent(): JSX.Element {
    const [activeForm, setActiveForm] = useState<ActiveForm>("user");
    const { isUserAdmin, checking } = AdminProtector();

    const renderForm = (): JSX.Element => {
        switch (activeForm) {
        case "user":
            return <AddUserForm />;
        case "team":
            return <AddTeamForm />;
        case "project":
            return <AddProjectForm />;
        default:
            return <AddUserForm />;
        }
    };

    if (checking) {
        return (
            <div className="space-y-3 max-w-md mx-auto" aria-busy="true" aria-label="Memeriksa izin…">
                <div className="animate-pulse rounded-lg bg-white/10 h-10 w-full" />
                <div className="animate-pulse rounded-lg bg-white/10 h-40 w-full" />
            </div>
        );
    }

    if (!isUserAdmin) {
        return (
            <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-red-200 text-sm">
                Akses ditolak — hanya admin yang boleh membuka halaman Forms.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Switch Form Buttons */}
            <div className="flex gap-3 justify-center">
                <Button
                    variant={activeForm === "user" ? "default" : "outline"}
                    onClick={() => setActiveForm("user")}
                    >
                    User
                </Button>
                <Button
                    variant={activeForm === "team" ? "default" : "outline"}
                    onClick={() => setActiveForm("team")}
                    >
                    Team
                </Button>
                <Button
                    variant={activeForm === "project" ? "default" : "outline"}
                    onClick={() => setActiveForm("project")}
                    >
                    Project
                </Button>
            </div>

        {/* Active Form */}
            {renderForm()}
        </div>
    );
}
