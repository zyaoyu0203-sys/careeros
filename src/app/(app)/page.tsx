import { BookUser, Briefcase, ChevronRight, ClipboardList, FileText, Radar, Settings2, SlidersHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CapabilityCarousel, type Slide } from "@/components/carousel";
import { Tabs } from "@/components/tabs";
import { Badge, Card, CompanyMark, formatDate, LinkButton, Meter, ScorePill, relativeDays } from "@/components/ui";
import { getPreferences, getProfile, listApplications, listJobs, listResumes, profileCompleteness } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { googleJobsAvailable } from "@/lib/sources";
import type { Application, ApplicationStatus } from "@/lib/types";

const FOLLOW_UP_DAYS = 7;
const ACTIVE: ApplicationStatus[] = ["applied", "assessment", "interview"];

const needsFollowUp = (a: Application) =>
  a.status === "applied" && a.appliedAt !== null && Date.now() - new Date(a.updatedAt).getTime() > FOLLOW_UP_DAYS * 864e5;

export default async function HomePage() {
  const userId = await requireUserId();
  const [profile, prefs, jobs, resumes, apps] = await Promise.all([
    getProfile(userId),
    getPreferences(userId),
    listJobs(userId),
    listResumes(userId),
    listApplications(userId),
  ]);

  const completeness = profileCompleteness(profile);
  const newJobs = jobs.filter(j => j.status === "new");
  const todayJobs = newJobs.filter(j => Date.now() - new Date(j.fetchedAt).getTime() < 864e5);
  const pendingResumes = resumes.filter(r => !r.approved);
  const preparing = apps.filter(a => a.status === "preparing");
  const active = apps.filter(a => ACTIVE.includes(a.status));
  const followUps = apps.filter(needsFollowUp);
  const topJob = newJobs[0];
  const newCompanies = [...new Set(newJobs.map(j => j.company))];
  const sourceCount =
    prefs.sources.greenhouse.length + prefs.sources.lever.length + prefs.sources.ashby.length + (prefs.sources.googleJobs && googleJobsAvailable() ? 1 : 0);

  const slides: Slide[] = [
    newJobs.length
      ? {
          overline: "Job push",
          title: `${todayJobs.length || newJobs.length} new roles matched to you`,
          body: topJob ? `Top match: ${topJob.title} at ${topJob.company}, scored against your knowledge base and preferences.` : "Ranked by fit with your experience.",
          cta: { label: "Review matches", href: "/jobs" },
          figure: String(todayJobs.length || newJobs.length).padStart(2, "0"),
          figureLabel: todayJobs.length ? "New today" : "Waiting for review",
        }
      : {
          overline: "Job push",
          title: "Let roles come to you",
          body: `CareerOS searches ${sourceCount || "your chosen"} source${sourceCount === 1 ? "" : "s"} on a ${prefs.frequency} schedule and only pushes roles that fit your profile.`,
          cta: { label: sourceCount ? "Run a search now" : "Choose job sources", href: sourceCount ? "/jobs" : "/settings" },
          figure: String(sourceCount).padStart(2, "0"),
          figureLabel: "Sources watched",
        },
    pendingResumes.length
      ? {
          overline: "Resume tailoring",
          title: `${pendingResumes.length} tailored resume${pendingResumes.length === 1 ? "" : "s"} awaiting your approval`,
          body: "Each draft only uses facts from your knowledge base. Review it once, then it is ready to send.",
          cta: { label: "Review drafts", href: `/resumes?id=${pendingResumes[0].id}` },
          figure: String(pendingResumes.length).padStart(2, "0"),
          figureLabel: "Drafts to approve",
        }
      : {
          overline: "Resume tailoring",
          title: topJob ? `Tailor your resume for ${topJob.company}` : "One resume per role, without rewriting",
          body: "CareerOS picks the best resume version for each job automatically, and can rewrite it around the job description using only your verified experience.",
          cta: { label: topJob ? "Open the role" : "See resume versions", href: topJob ? `/jobs?id=${topJob.id}` : "/resumes" },
          figure: String(resumes.filter(r => r.kind === "version").length).padStart(2, "0"),
          figureLabel: "Resume versions",
        },
    {
      overline: "Knowledge base",
      title: completeness.percent === 100 ? "Your knowledge base is complete" : `Your profile is ${completeness.percent}% complete`,
      body:
        completeness.percent === 100
          ? "Every application pack is pre-filled from it: work rights, start date, availability and more."
          : `Add ${completeness.missing.slice(0, 2).join(" and ").toLowerCase()} so application packs can be filled in for you.`,
      cta: { label: "Open knowledge base", href: "/profile" },
      figure: `${completeness.percent}%`,
      figureLabel: "Profile strength",
    },
    {
      overline: "Application tracking",
      title: followUps.length ? `${followUps.length} application${followUps.length === 1 ? "" : "s"} to follow up` : `${active.length} active application${active.length === 1 ? "" : "s"}`,
      body: followUps.length
        ? `No update for over ${FOLLOW_UP_DAYS} days. A short follow-up note keeps you visible.`
        : "Every pack you prepare is tracked from preparing to offer. Update a status in one click.",
      cta: { label: "Open tracker", href: "/applications" },
      figure: String(followUps.length || active.length).padStart(2, "0"),
      figureLabel: followUps.length ? "Need follow-up" : "In progress",
    },
  ];

  const statusCounts = (["preparing", "applied", "assessment", "interview", "offer", "rejected"] as ApplicationStatus[]).map(s => ({
    status: s,
    count: apps.filter(a => a.status === s).length,
  }));

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[5fr_7fr]">
        {/* Profile panel */}
        <article className="navy-panel rounded-[4px] p-6 sm:p-7">
          <div className="flex items-center gap-5">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-white/80 bg-navy-700 text-2xl font-semibold">
              {profile.fullName.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("")}
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-[26px] leading-tight font-semibold">{profile.fullName}</h1>
              <p className="mt-1 line-clamp-2 text-[14px] text-white/80">{profile.headline || "Add a headline in your knowledge base"}</p>
              {profile.location && <p className="mt-0.5 text-[13px] text-white/60">{profile.location}</p>}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-[12.5px] text-white/80">
              <span>Profile strength</span>
              <span className="font-semibold text-white">{completeness.percent}%</span>
            </div>
            <Meter value={completeness.percent} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickTile href="/jobs" icon={<Radar size={20} />} label="Jobs" count={newJobs.length} />
            <QuickTile href="/resumes" icon={<FileText size={20} />} label="Resumes" count={pendingResumes.length} />
            <QuickTile href="/applications" icon={<ClipboardList size={20} />} label="Tracker" count={preparing.length} />
            <QuickTile href="/profile" icon={<BookUser size={20} />} label="Profile" />
          </div>
        </article>

        {/* My Day */}
        <Card className="overflow-hidden border-navy-900">
          <Tabs
            tabs={[
              {
                label: "My Day",
                content: (
                  <div>
                    <div className="flex items-center justify-between bg-navy-900 px-5 py-3 text-white">
                      <strong className="text-[15px]">Today · {formatDate(new Date().toISOString(), { weekday: "short", day: "numeric", month: "long" })}</strong>
                      <span className="text-[12.5px] text-white/70">
                        {prefs.lastRunAt ? `Last search ${relativeDays(prefs.lastRunAt).toLowerCase()}` : "No search run yet"}
                      </span>
                    </div>
                    <div className="bg-blue-100 px-5 py-2 text-[13px] text-navy-800">{prefs.lastRunSummary ?? `Searches run ${prefs.frequency === "manual" ? "when you ask" : prefs.frequency}`}</div>
                    <DayRow
                      label="New roles to review"
                      detail={newCompanies.length ? newCompanies.slice(0, 2).join(", ") + (newJobs.length > 2 ? ` · ${newJobs.length} roles` : "") : "Nothing new yet"}
                      count={newJobs.length}
                      href="/jobs"
                      cta="Review"
                    />
                    <DayRow label="Resume drafts to approve" detail={pendingResumes[0]?.name ?? "No drafts waiting"} count={pendingResumes.length} href="/resumes" cta="Approve" />
                    <DayRow label="Application packs in progress" detail={preparing[0] ? `${preparing[0].company} · ${preparing[0].title}` : "None in progress"} count={preparing.length} href="/applications" cta="Continue" />
                    <DayRow
                      label="Follow-ups due"
                      detail={followUps[0] ? `${followUps[0].company} — applied ${relativeDays(followUps[0].appliedAt).toLowerCase()}` : `None — applications older than ${FOLLOW_UP_DAYS} days appear here`}
                      count={followUps.length}
                      href="/applications"
                      cta="Open"
                    />
                  </div>
                ),
              },
              {
                label: "Pipeline",
                content: (
                  <div>
                    <div className="flex items-center justify-between bg-navy-900 px-5 py-3 text-white">
                      <strong className="text-[15px]">Application pipeline</strong>
                      <span className="text-[12.5px] text-white/70">{apps.length} tracked</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3">
                      {statusCounts.map(({ status, count }) => (
                        <Link key={status} href="/applications" className="border-r border-b border-line-soft px-5 py-5 hover:bg-blue-50">
                          <div className="font-serif text-[32px] leading-none font-semibold text-navy-900 tabular-nums">{count}</div>
                          <div className="mt-1.5 text-[13px] text-muted capitalize">{status}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </section>

      <CapabilityCarousel slides={slides} />

      <section className="mt-4 grid gap-6 lg:grid-cols-[8fr_4fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-[26px] font-semibold text-navy-900">Recommended roles</h2>
              <p className="text-[14px] text-muted">Highest fit first, scored against your knowledge base.</p>
            </div>
            <LinkButton href="/jobs" variant="secondary" size="sm">
              View all roles
            </LinkButton>
          </div>
          {newJobs.length ? (
            <div className="grid gap-3">
              {newJobs.slice(0, 4).map(job => {
                const version = resumes.find(r => r.id === job.suggestedResumeId);
                return (
                  <Card key={job.id} className="flex items-center gap-4 p-4 sm:p-5">
                    <CompanyMark name={job.company} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-navy-700">{job.company}</div>
                      <h3 className="truncate text-[16px] font-semibold text-ink">{job.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <ScorePill score={job.score} scoredBy={job.scoredBy} />
                        <Badge>{job.location || "Location not listed"}</Badge>
                        {version && <Badge tone="blue">Resume: {version.name}</Badge>}
                        {job.risks.length > 0 && <Badge tone="amber">{job.risks.length} risk{job.risks.length > 1 ? "s" : ""}</Badge>}
                      </div>
                    </div>
                    <LinkButton href={`/jobs?id=${job.id}`} variant="secondary" size="sm" className="hidden sm:inline-flex">
                      View role
                    </LinkButton>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="px-6 py-10 text-center">
              <Briefcase className="mx-auto text-navy-700" size={28} />
              <h3 className="mt-3 font-serif text-xl font-semibold text-navy-900">No roles waiting</h3>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-muted">Run a search from the Jobs page, or add more sources so the scheduled search has more to work with.</p>
              <div className="mt-4 flex justify-center gap-2">
                <LinkButton href="/jobs">Go to jobs</LinkButton>
                <LinkButton href="/settings" variant="secondary">
                  Job sources
                </LinkButton>
              </div>
            </Card>
          )}
        </div>

        <aside>
          <Card className="overflow-hidden">
            <h2 className="bg-navy-900 px-5 py-4 text-[17px] font-semibold text-white">Job seeker admin</h2>
            <AdminLink href="/settings" icon={<SlidersHorizontal size={20} />} title="Job sources & schedule" detail={`${sourceCount} source${sourceCount === 1 ? "" : "s"} · runs ${prefs.frequency}`} />
            <AdminLink href="/resumes" icon={<FileText size={20} />} title="Resume versions" detail={`${resumes.filter(r => r.kind === "version").length} versions · routed automatically`} />
            <AdminLink href="/profile#answers" icon={<Settings2 size={20} />} title="Application answers" detail={profile.answers.workAuthorization || "Work rights, sponsorship, start date"} />
            <AdminLink href="/profile#experience" icon={<UserRound size={20} />} title="Experience library" detail={`${profile.experiences.length} experiences · ${profile.experiences.reduce((n, e) => n + e.bullets.length, 0)} facts`} />
          </Card>
        </aside>
      </section>
    </>
  );
}

function QuickTile({ href, icon, label, count }: { href: string; icon: ReactNode; label: string; count?: number }) {
  return (
    <Link href={href} className="relative grid h-[76px] place-items-center content-center gap-1.5 rounded-[3px] bg-navy-700 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600">
      {icon}
      {label}
      {count ? <span className="absolute top-1.5 right-1.5 grid h-5 min-w-5 place-items-center rounded-[3px] bg-amber-500 px-1 text-[11px] font-bold text-navy-950">{count}</span> : null}
    </Link>
  );
}

function DayRow({ label, detail, count, href, cta }: { label: string; detail: string; count: number; href: string; cta: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-line-soft px-5 py-3.5 last:border-b-0">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[3px] text-[15px] font-bold tabular-nums ${count ? "bg-amber-100 text-[#8a5a10]" : "bg-line-soft text-muted"}`}>{count}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-ink">{label}</div>
        <div className="truncate text-[13px] text-muted">{detail}</div>
      </div>
      {count > 0 && (
        <LinkButton href={href} variant="secondary" size="sm">
          {cta}
        </LinkButton>
      )}
    </div>
  );
}

function AdminLink({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <Link href={href} className="group mx-5 flex items-center gap-3.5 border-b border-line-soft py-4 last:border-b-0">
      <span className="text-navy-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink group-hover:text-navy-700">{title}</span>
        <span className="block truncate text-[13px] text-muted">{detail}</span>
      </span>
      <ChevronRight size={16} className="text-muted" />
    </Link>
  );
}
