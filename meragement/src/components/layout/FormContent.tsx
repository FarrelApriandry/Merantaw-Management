// src/components/forms/FormContent.tsx
import { useState, type JSX } from "react";
import AddUserForm from "@/components/forms/AddUserForm";
import AddTeamForm from "@/components/forms/AddTeamForm";
import AddProjectForm from "@/components/forms/AddProjectForm";
import { Button } from "@/components/ui/button";

type ActiveForm = "user" | "team" | "project";

export default function FormContent(): JSX.Element {
    const [activeForm, setActiveForm] = useState<ActiveForm>("user");

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
