// src/components/forms/AddUserForm.jsx
import { useState } from "react";
import { db, auth, getEmailAuth } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    } from "@/components/ui/select";

export default function AddUserForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        photoURL: "",
        role: "member",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
        ...formData,
        [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
        // 1️⃣ Buat user di Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
        );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: formData.name,
            email: formData.email,
            photoURL: formData.photoURL || "",
            role: formData.role ,
            joinedTeams: [],
            isActive: true,
            createdBy: getEmailAuth(),
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        });

        await setDoc(doc(db, "users_public", user.uid), {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            createdAt: serverTimestamp()
        });

        toast.success("✅ User added successfully!", {
            description: `${formData.name} berhasil ditambahkan.`,
        });

        console.log("✅ User created in Auth & Firestore:", user.uid);

        setFormData({
            name: "",
            email: "",
            password: "",
            photoURL: "",
            role: "member",
        });
        } catch (error) {
        console.error(error);
        toast.error("❌ Failed to add user.", {
            description: error.message,
        });
        } finally {
        setLoading(false);
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
            <CardTitle className="text-white">Add New User</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                <Label htmlFor="name" className="text-white/80">
                    Name
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
                <Label htmlFor="email" className="text-white/80">
                    Email
                </Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                    required
                />
                </div>

                <div>
                <Label htmlFor="password" className="text-white/80">
                    Password
                </Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                    required
                />
                </div>

                <div>
                <Label htmlFor="photoURL" className="text-white/80">
                    Photo URL (optional)
                </Label>
                <Input
                    id="photoURL"
                    name="photoURL"
                    value={formData.photoURL}
                    onChange={handleChange}
                    className="bg-white/10 text-white border-white/20 focus-visible:ring-cyan-400"
                />
                </div>

                <div>
                <Label htmlFor="role" className="text-white/80">
                    Role
                </Label>
                <Select
                    value={formData.role}
                    onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                    }
                >
                    <SelectTrigger className="w-full bg-white/10 text-white border border-white/20 focus-visible:ring-cyan-400">
                    <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a]/90 border-white/20 text-white backdrop-blur-xl">
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                >
                {loading ? "Processing..." : "Add User"}
                </Button>
            </form>
            </CardContent>
        </Card>
        </motion.div>
    );
}
