// src/components/layout/DashboardContent.jsx
import {
    Users,
    Folder,
    Target,
    Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatCard from "../dashboard/StatCard";
import ProjectCard from "../dashboard/ProjectCard";
import TaskCard from "../dashboard/TaskCard";

export default function DashboardContent() {
    return (
        <div className="space-y-8">
        {/* --- Stats Section --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Users />} label="Active Members" value="12" />
            <StatCard icon={<Folder />} label="Projects" value="5" />
            <StatCard icon={<Target />} label="Goals Achieved" value="8" />
        </section>

        {/* --- Project & Task Section --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project List */}
            <div className="rounded-2xl border border-white/30 p-4 shadow-sm">
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/50"><Folder/>Projects</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    <ProjectCard
                        title="Nusantara: Pasar Bubrah"
                        desc="Folklore Indonesian Game"
                        progress={100}
                    />
                    <ProjectCard
                        title="Another Realm"
                        desc="Indonesian Mythology Horror Game"
                        progress={60}
                    />
                    </div>
                </ScrollArea>
            </div>

            {/* Task List */}
            <div className="rounded-2xl border border-white/30 p-4 shadow-sm">
                <h2 className="flex text-lg font-semibold mb-3 gap-2 text-white/50"><Check/>Tasks</h2>
                <ScrollArea className="h-80 pr-3">
                    <div className="space-y-4">
                    <TaskCard title="Connect Firebase" status="Done" assigned="Mint" />
                    <TaskCard title="Finalize UI Design" status="In Progress" assigned="Bayu" />
                    <TaskCard title="Fix Animation Bug" status="In Progress" assigned="Bayu" />
                    <TaskCard title="Set up Hosting" status="Pending" assigned="Andra" />
                    <TaskCard title="Testing Build" status="Pending" assigned="Mint" />
                    </div>
                </ScrollArea>
            </div>
        </section>
        </div>
    );
}
