import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../src/auth/useAuth";

export const LoginView: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(email, password);
        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.message || "Erro ao fazer login. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <img
                src="https://pub-db8ed4fb33634589a6ce5fb07e85cb46.r2.dev/logo/bihmks/fundo_bihplat.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                aria-hidden="true"
            />

            <div className="absolute inset-0 bg-black/30" />

            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 flex h-full w-full md:w-1/2 items-center justify-center px-6 md:px-0"
            >
                <div className="w-full max-w-sm md:px-8 flex flex-col gap-6">
                    <img
                        src="https://pub-db8ed4fb33634589a6ce5fb07e85cb46.r2.dev/logo/bihmks/logo_bihmks_branco.svg"
                        alt="Logo"
                        className="h-10 w-auto"
                    />

                    <div>
                        <h1 className="text-4xl font-bold text-white">
                            Faça seu <span className="text-purple-400">login</span>.
                        </h1>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-white/70">Login</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="
                                    bg-white/10 backdrop-blur-sm
                                    border border-white/20
                                    rounded-xl px-4 py-3
                                    text-white placeholder-white/30
                                    focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400
                                    transition
                                "
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-white/70">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20
                                               rounded-xl px-4 py-3 pr-10
                                               text-white placeholder-white/30
                                               focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400
                                               transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="
                                mt-2 w-full py-3 rounded-xl
                                bg-gradient-to-r from-purple-500 to-pink-500
                                hover:from-purple-600 hover:to-pink-600
                                text-white font-semibold text-base
                                shadow-lg shadow-purple-500/30
                                transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                flex items-center justify-center gap-2
                            "
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            Acessar
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};
