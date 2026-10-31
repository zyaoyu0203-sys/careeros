import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { Brand } from "@/components/brand";
import { MainNav } from "@/components/nav";
import { getProfile, listApplications, listJobs, listResumes } from "@/lib/data";
import { currentUserEmail, requireUserId } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (!profile.onboardedAt) redirect("/onboarding");

  const [jobs, resumes, apps, email] = await Promise.all([listJobs(userId), listResumes(userId), listApplications(userId), currentUserEmail()]);
  const initials = profile.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen">
      <header className="no-print border-t-4 border-navy-900 bg-surface">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-[14px] font-semibold text-ink">{profile.fullName}</div>
              <div className="text-[12.5px] text-muted">{email ?? "Local workspace"}</div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-navy-700 text-[14px] font-semibold text-white">{initials}</span>
            <form action={signOut}>
              <button className="grid h-10 w-10 place-items-center rounded-[3px] text-muted hover:bg-blue-50 hover:text-navy-800" aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <MainNav
          items={[
            { href: "/", label: "Home" },
            { href: "/jobs", label: "Jobs", count: jobs.filter(j => j.status === "new").length },
            { href: "/resumes", label: "Resumes", count: resumes.filter(r => !r.approved).length },
            { href: "/applications", label: "Applications", count: apps.filter(a => a.status === "preparing").length },
            { href: "/profile", label: "Knowledge base" },
            { href: "/settings", label: "Job sources" },
          ]}
        />
      </header>
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
