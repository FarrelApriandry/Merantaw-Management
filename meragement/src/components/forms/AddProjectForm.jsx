// src/components/forms/AddProjectForm.jsx
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, getEmailAuth } from "@/lib/firebaseConfig";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

export default function AddProjectForm() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        shortCall: "",
        description: "",
        status: "active",
        priority: "medium",
        teamId: "",
        assignedUsers: [],
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch teams
                const teamsSnapshot = await getDocs(collection(db, "teams"));
                const teamsList = teamsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setTeams(teamsList);
    
                // Fetch users
                const usersSnapshot = await getDocs(collection(db, "users_public"));
                const usersList = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setUsers(usersList);
            }
        });
        return () => unsubscribe();
    }, []);    

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTeamSelect = async (teamId) => {
        setFormData({ ...formData, teamId });
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const memberIds = teamData.members.map((m) => m.userId);
        setFormData((prev) => ({ ...prev, assignedUsers: memberIds }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
        await addDoc(collection(db, "projects"), {
            ...formData,
            createdBy: getEmailAuth(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast.success("✅ Project created successfully!");
        setFormData({
            title: "",
            description: "",
            shortCall: "",
            status: "active",
            priority: "medium",
            teamId: "",
            assignedUsers: [],
        });
        } catch (error) {
            console.error(error);
            toast.error("❌ Failed to create project.");
        }
    };

    return (
        <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto"
        >
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/10 backdrop-blur-xl text-white shadow-[0_0_25px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,200,255,0.25)] transition-all duration-300">
            <CardHeader>
            <CardTitle className="text-white">Add New Project</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                <Label htmlFor="title" className="text-white/80">
                    Title
                </Label>
                <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                    required
                />
                </div>
                <div>
                <Label htmlFor="shortCall" className="text-white/80">
                    Short Call
                </Label>
                <Input
                    id="shortCall"
                    name="shortCall"
                    value={formData.shortCall}
                    onChange={handleChange}
                    className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                    required
                />
                </div>

                <div>
                <Label htmlFor="description" className="text-white/80">
                    Description
                </Label>
                <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                />
                </div>

                <div>
                <Label className="text-white/80">Priority</Label>
                <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                    }
                >
                    <SelectTrigger className="bg-white/10 text-white border-white/20">
                    <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white backdrop-blur-xl">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div>
                    <Label className="text-white/80">Team</Label>
                    <Select
                        value={formData.teamId}
                        onValueChange={(value) => handleTeamSelect(value)}
                    >
                        <SelectTrigger className="bg-white/10 text-white border-white/20">
                        <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white backdrop-blur-xl">
                        {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                            {team.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>

                    {/* Tampilkan anggota tim di bawah dropdown */}
                    {formData.teamId && (() => {
                        const selectedTeam = teams.find(t => t.id === formData.teamId);
                        if (!selectedTeam || !selectedTeam.members?.length) return null;
                        return (
                        <div className="p-2 mt-2 bg-[#1a1a1a]/70 border border-white/20 rounded text-sm text-white/80">
                            <div className="mb-1 font-semibold">Members:</div>
                            {selectedTeam.members.map((m, i) => {
                            const user = users.find(u => u.id === m.userId);
                            return (
                                <div key={i} className="ml-2">
                                {user ? `${user.name} (${user.email})` : m.userId}
                                </div>
                            );
                            })}
                        </div>
                        );
                    })()}
                </div>


                <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                >
                Create Project
                </Button>
            </form>
            </CardContent>
        </Card>
        </motion.div>
    );
}
