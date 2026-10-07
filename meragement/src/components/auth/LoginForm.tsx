// src/components/auth/LoginForm.tsx
import { toast } from "sonner";
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { doc, getDoc } from "firebase/firestore";
import type { StoredUser } from "@/lib/types";

export default function LoginForm(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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

      // 🔹 P0: baca users/{uid} — bukan query users_public by email (bocor + bisa dipalsu)
      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        await auth.signOut().catch(() => undefined);
        try { localStorage.removeItem("userData"); } catch { /* ignore */ }
        toast.warning("Akun belum terdaftar di sistem!");
        return;
      }
      const userData = snap.data() as Partial<StoredUser> & { name?: string; role?: string; status?: string; isActive?: boolean };
      if (userData.isActive === false) {
        await auth.signOut().catch(() => undefined);
        try { localStorage.removeItem("userData"); } catch { /* ignore */ }
        toast.error("Akun dinonaktifkan", { description: "Hubungi admin." });
        return;
      }

      toast.success("Login berhasil!", {
        description: `Selamat datang, ${userData.name || "user"}!`,
      });

      // 🔹 Cache display saja — otorisasi tetap via AuthProtector + rules
      localStorage.setItem(
        "userData",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: userData.role || "member",
          status: userData.status || "active",
          name: userData.name || "User",
        })
      );

      // 🔹 Redirect ke dashboard
      setTimeout(() => (window.location.href = "/dashboard/"), 1500);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Periksa kembali email dan password Anda.";
      toast.error("Gagal Login", {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // P0: jangan percaya localStorage — cek sesi Firebase Auth
    const unsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
                // Delay untuk toast
                const toastDelay = setTimeout(() => {
                    toast.success("Anda sudah login! (session)", {
                        description: `Selamat datang kembali!`,
                    });
                }, 1000); // Delay 1 detik untuk toast

                // Delay untuk redirect
                const redirectDelay = setTimeout(() => {
                    window.location.href = "/dashboard/";
                }, 2500); // Delay 2.5 detik untuk redirect

        void toastDelay;
        void redirectDelay;
      }
    });
    return () => unsub();
  }, []);

  return (
    <motion.div
      className="max-w-sm mx-auto p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center mb-6">
        <img
          src="/favicon.svg"
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
