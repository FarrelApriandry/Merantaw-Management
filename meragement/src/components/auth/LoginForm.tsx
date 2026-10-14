// src/components/auth/LoginForm.tsx — login via better-auth (cookie session).
// Tidak ada lagi delay artifisial.
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginForm(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Sudah login → langsung dashboard
  const { data: session, isPending } = authClient.useSession();
  useEffect(() => {
    if (!isPending && session?.user) {
      window.location.href = "/dashboard/";
    }
  }, [isPending, session]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Email dan password wajib diisi");
        return;
      }
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        const msg = res.error.message ?? "Periksa kembali email dan password Anda.";
        setError(msg);
        toast.error("Gagal Login", { description: msg });
        return;
      }
      toast.success("Login berhasil!", {
        description: `Selamat datang, ${res.data?.user.name || "user"}!`,
      });
      window.location.href = "/dashboard/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan.";
      setError(msg);
      toast.error("Gagal Login", { description: msg });
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
          src="/favicon.ico"
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
          {loading ? "Masuk…" : "Login"}
        </Button>
      </form>
    </motion.div>
  );
}
