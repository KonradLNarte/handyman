import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase-server";
import { LogoutButton } from "./logout-button";
import { NotificationBell } from "./components/notification-bell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-gray-700 flex items-center justify-between">
          Resonansia
          <NotificationBell />
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded hover:bg-gray-800"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded hover:bg-gray-800"
          >
            Projekt
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 truncate mb-2">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-auto">{children}</main>
    </div>
  );
}
