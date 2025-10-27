// src/components/auth/LoginForm.jsx
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Email dan password wajib diisi");
        setLoading(false);
        return;
      }

      // 🔹 Login ke Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔹 Ambil data user dari Firestore (users_public)
      const q = query(collection(db, "users_public"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() };
        
        toast.success("Login berhasil!", {
          description: `Selamat datang, ${userData.name || "user"}!`,
        });

        // 🔹 Simpan ke localStorage untuk auth protector
        localStorage.setItem(
          "userData",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: userData.role || "user",
            status: userData.status || "active",
            name: userData.name || "User",
          })
        );

        // 🔹 Redirect ke dashboard
        setTimeout(() => (window.location.href = "/dashboard/"), 1500);
      } else {
        toast.warning("Akun belum terdaftar di sistem!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal Login", {
        description: err.message || "Periksa kembali email dan password Anda.",
      });
    } finally {
      setLoading(false);
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
        <h2 className="text-2xl font-bold text-white">Welcome to Meragement</h2>
        <p className="text-sm text-gray-300">Manage your projects efficiently</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/20 border-none text-white placeholder-gray-100"
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
          disabled={loading}
          className="btn-primary mt-3 backdrop-blur-xl"
        >
          {loading ? "Loading..." : "Login"}
        </Button>
      </form>
    </motion.div>
  );
}
