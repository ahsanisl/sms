"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/session-context";
import { DEMO_USERS, findDemoUser } from "@/lib/mock";
import { ROLE_LABEL } from "@/lib/nav-config";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [identifier, setIdentifier] = useState("admin@eduflow.pk");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function signIn(email: string) {
    const user = findDemoUser(email);
    if (!user) {
      setError("We couldn't find a demo account with that email. Try one of the accounts below.");
      return;
    }
    setError("");
    login(user);
    toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signIn(identifier);
  }

  return (
    <div className="flex h-full w-full">
      {/* Left Pane: Brand */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-surface-container relative flex-col justify-between overflow-hidden border-r border-outline-variant/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-surface-container" />
        <div className="relative z-10 p-margin pt-12">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-secondary" size={32} />
            <span className="text-headline-sm font-bold text-primary tracking-tight">EduFlow</span>
          </div>
        </div>
        <div className="relative z-10 p-margin pb-16 max-w-[480px]">
          <h1 className="text-display-sm font-bold text-on-surface mb-6">
            Everything your school needs, in one place.
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Manage students, attendance, fees, exams and communication from one modern school
            management platform.
          </p>
          <div className="flex gap-4 mt-12 opacity-80">
            <div className="h-1 w-12 rounded-full bg-secondary" />
            <div className="h-1 w-2 rounded-full bg-outline-variant" />
            <div className="h-1 w-2 rounded-full bg-outline-variant" />
          </div>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="w-full lg:w-1/2 xl:w-7/12 bg-surface-container-lowest flex items-center justify-center p-lg sm:p-margin relative overflow-y-auto">
        <div className="absolute top-8 left-8 flex lg:hidden items-center gap-2">
          <GraduationCap className="text-secondary" size={28} />
          <span className="text-title-lg font-semibold text-primary">EduFlow</span>
        </div>

        <div className="w-full max-w-[400px] py-16 lg:py-0">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-headline-lg font-semibold text-on-surface mb-2">Welcome back</h2>
            <p className="text-body-md text-on-surface-variant">Please enter your details to sign in.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-label-sm text-on-surface" htmlFor="identifier">
                Email or Phone number
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@school.edu"
                className="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-label-sm text-on-surface" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 pr-10 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <p className="text-label-sm text-error">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary cursor-pointer"
                />
                <label className="ml-2 block text-body-md text-on-surface-variant cursor-pointer" htmlFor="remember-me">
                  Remember me
                </label>
              </div>
              <a
                href="/forgot-password"
                className="text-label-md text-secondary hover:text-on-secondary-fixed-variant transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="flex w-full justify-center items-center rounded-lg bg-secondary px-4 py-3 text-label-md font-semibold text-on-secondary shadow-sm hover:bg-secondary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-surface-container-lowest transition-all"
              >
                Log In
              </button>
            </div>
          </form>

          <div className="mt-8">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-3 text-center lg:text-left">
              This is a frontend prototype — try a demo account
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => signIn(user.email)}
                  className="rounded-lg border border-outline-variant px-3 py-2 text-left hover:bg-surface-container-low transition-colors"
                >
                  <p className="text-label-md font-semibold text-primary">{ROLE_LABEL[user.role]}</p>
                  <p className="text-label-sm text-on-surface-variant truncate">{user.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
