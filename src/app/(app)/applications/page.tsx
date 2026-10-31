import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { addApplication } from "@/app/actions";
import { Badge, Button, Card, EmptyState, Input, Label, LinkButton, PageHeader, Select, formatDate, relativeDays } from "@/components/ui";
import { listApplications, listResumes } from "@/lib/data";
import { requireUserId } from "@/lib/session";
import { STATUSES, statusMeta } from "@/lib/status";
import { StatusSelect } from "./status-select";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const params = await searchParams;
  const userId = await requireUserId();
  const [apps, resumes] = await Promise.all([listApplications(userId), listResumes(userId)]);
  const resumeName = (id: string | null) => resumes.find(r => r.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        overline="Tracker"
        title="Applications"
        description="Every application from preparing to offer. Change a status and CareerOS keeps the history."
        actions={
          <LinkButton href={params.add ? "/applications" : "/applications?add=1"} variant={params.add ? "ghost" : "primary"}>
            <Plus size={16} /> {params.add ? "Close" : "Log an application"}
          </LinkButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {STATUSES.map(s => (
          <Card key={s.value} className="px-4 py-3">
            <div className="font-serif text-[28px] leading-none font-semibold text-navy-900 tabular-nums">{apps.filter(a => a.status === s.value).length}</div>
            <div className="mt-1 text-[13px] text-muted">{s.label}</div>
          </Card>
        ))}
      </div>

      {params.add && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-[17px] font-semibold text-navy-900">Log an application you made elsewhere</h2>
          <form action={addApplication} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Label label="Company">
              <Input name="company" required />
            </Label>
            <Label label="Role">
              <Input name="title" required />
            </Label>
            <Label label="Link">
              <Input name="url" type="url" placeholder="https://" />
            </Label>
            <Label label="Status">
              <Select name="status" defaultValue="applied">
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Label>
            <Label label="Resume used">
              <Select name="resumeId" defaultValue="">
                <option value="">Not recorded</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Label>
            <Label label="Notes">
              <Input name="notes" />
            </Label>
            <div>
              <Button>Save application</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {apps.length === 0 ? (
          <EmptyState title="Nothing tracked yet" body="Choose “Prepare application” on a role, or log one you made elsewhere." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-navy-900 bg-blue-50 text-[12px] font-semibold tracking-[0.08em] text-navy-800 uppercase">
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Resume</th>
                  <th className="px-5 py-3">Applied</th>
                  <th className="px-5 py-3">Last update</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id} className="border-b border-line-soft last:border-b-0 hover:bg-blue-50/50">
                    <td className="px-5 py-3.5">
                      <div className="text-[15px] font-semibold text-ink">{app.title}</div>
                      <div className="text-[13px] text-muted">{app.company}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusSelect id={app.id} value={app.status} label={`Status for ${app.title} at ${app.company}`} />
                        {app.status === "preparing" && <Badge tone={statusMeta(app.status).tone}>To finish</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[14px] text-ink-soft">{resumeName(app.resumeId)}</td>
                    <td className="px-5 py-3.5 text-[14px] text-ink-soft">{formatDate(app.appliedAt)}</td>
                    <td className="px-5 py-3.5 text-[14px] text-muted">{relativeDays(app.updatedAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/applications/${app.id}`} className="inline-flex items-center gap-1 text-[14px] font-semibold text-navy-700 hover:underline">
                        {app.status === "preparing" ? "Open pack" : "Details"} <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
