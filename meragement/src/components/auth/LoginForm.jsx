// src/components/auth/LoginForm.jsx
"use-client"

import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Berhasil Login.")
      window.location.href = "/dashboard";
    } catch (err) {
      toast.warning("Email atau Password salah!");
    }
  };

  return (
    <motion.div
      className="max-w-sm mx-auto p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center mb-6">
        <img
          src="/LogoMTW.svg"
          alt="Merantaw Logo"
          className="w-14 h-14 mx-auto mb-2 opacity-80"
        />
        <h2 className="text-2xl font-bold text-white">Welcome to Merantaw</h2>
        <p className="text-sm text-gray-300">Manage your projects efficiently</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/20 border-none text-white placeholder-gray-300"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-white/20 border-none text-white placeholder-gray-300"
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button
          type="submit"
          className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all"
        >
          Login
        </Button>
      </form>
    </motion.div>
  );
}
