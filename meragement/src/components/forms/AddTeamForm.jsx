// src/components/forms/AddTeamForm.jsx
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, getEmailAuth } from "@/lib/firebaseConfig";
import {
    collection,
    addDoc,
    getDocs,
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

export default function AddTeamForm() {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        members: [{ userId: "", roles: [""] }],
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const querySnapshot = await getDocs(collection(db, "users"));
                const usersList = querySnapshot.docs.map((doc) => ({
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

    const handleMemberChange = (index, field, value) => {
        const updatedMembers = [...formData.members];
        if (field === "userId") updatedMembers[index].userId = value;
        setFormData({ ...formData, members: updatedMembers });
    };

    const handleRoleChange = (memberIndex, roleIndex, value) => {
        const updatedMembers = [...formData.members];
        updatedMembers[memberIndex].roles[roleIndex] = value;
        setFormData({ ...formData, members: updatedMembers });
    };

    const addRole = (memberIndex) => {
        const updatedMembers = [...formData.members];
        updatedMembers[memberIndex].roles.push("");
        setFormData({ ...formData, members: updatedMembers });
    };

    const addMember = () => {
        setFormData({
        ...formData,
        members: [...formData.members, { userId: "", roles: [""] }],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
        await addDoc(collection(db, "teams"), {
            ...formData,
            createdBy: getEmailAuth(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast.success("✅ Team created successfully!");
        setFormData({
            name: "",
            description: "",
            members: [{ userId: "", roles: [""] }],
        });
        } catch (error) {
        console.error(error);
        toast.error("❌ Failed to create team.");
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
            <CardTitle className="text-white">Add New Team</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                <Label htmlFor="name" className="text-white/80">
                    Team Name
                </Label>
                <Input
                    id="name"
                    name="name"
                    value={formData.name}
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

                {/* Members Section */}
                <div className="space-y-4">
                <Label className="text-white/80">Members</Label>
                {formData.members.map((member, memberIndex) => (
                    <div
                    key={memberIndex}
                    className="p-3 rounded-md bg-white/5 border border-white/10 space-y-2"
                    >
                    <Select
                        value={member.userId}
                        onValueChange={(value) =>
                        handleMemberChange(memberIndex, "userId", value)
                        }
                    >
                        <SelectTrigger className="w-full bg-white/10 text-white border border-white/20">
                        <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white backdrop-blur-xl">
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>

                    {/* Roles */}
                    {member.roles.map((role, roleIndex) => (
                        <Input
                        key={roleIndex}
                        placeholder="Enter role"
                        value={role}
                        onChange={(e) =>
                            handleRoleChange(memberIndex, roleIndex, e.target.value)
                        }
                        className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                        />
                    ))}
                    <Button
                        type="button"
                        onClick={() => addRole(memberIndex)}
                        className="bg-cyan-500/30 hover:bg-cyan-500/40 text-white text-xs"
                    >
                        + Add Role
                    </Button>
                    </div>
                ))}

                <Button
                    type="button"
                    onClick={addMember}
                    className="bg-blue-500/30 hover:bg-blue-500/40 text-white text-xs"
                >
                    + Add Member
                </Button>
                </div>

                <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                >
                Create Team
                </Button>
            </form>
            </CardContent>
        </Card>
        </motion.div>
    );
}
