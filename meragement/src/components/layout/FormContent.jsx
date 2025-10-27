// src/components/forms/FormContent.jsx
import { useState } from "react";
import AddUserForm from "../forms/AddUserForm";
import AddTeamForm from "../forms/AddTeamForm";
import AddProjectForm from "../forms/AddProjectForm";
import { Button } from "@/components/ui/button";

export default function FormContent() {
    const [activeForm, setActiveForm] = useState("user");

    const renderForm = () => {
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
