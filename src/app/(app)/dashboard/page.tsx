"use client";

import { useSession } from "@/lib/auth/session-context";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard";

export default function DashboardPage() {
  const { user } = useSession();
  if (!user) return null;

  if (user.role === "teacher") return <TeacherDashboard />;
  if (user.role === "parent") return <ParentDashboard />;
  if (user.role === "accountant") return <AccountantDashboard />;
  return <AdminDashboard />;
}
