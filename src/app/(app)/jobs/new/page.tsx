import type { Metadata } from "next";
import { addJob } from "@/app/actions";
import { Button, Card, Input, Label, LinkButton, PageHeader, Textarea } from "@/components/ui";

export const metadata: Metadata = { title: "Add a job" };

export default function NewJobPage() {
  return (
    <>
      <PageHeader
        overline="Jobs"
        title="Add a job you found"
        description="For roles from LinkedIn, referrals or anywhere CareerOS can't search. It's scored and routed to a resume like any other role."
      />
      <Card className="max-w-3xl p-6 sm:p-8">
        <form action={addJob} className="grid gap-4 sm:grid-cols-2">
          <Label label="Company">
            <Input name="company" required />
          </Label>
          <Label label="Job title">
            <Input name="title" required />
          </Label>
          <Label label="Location">
            <Input name="location" placeholder="Hong Kong" />
          </Label>
          <Label label="Link to the posting">
            <Input name="url" type="url" placeholder="https://" required />
          </Label>
          <Label label="Job description" hint="Paste the full text — it's what scoring and resume tailoring work from." className="sm:col-span-2">
            <Textarea name="description" className="min-h-64" required />
          </Label>
          <div className="flex gap-2 sm:col-span-2">
            <Button>Add and score</Button>
            <LinkButton href="/jobs" variant="ghost">
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </>
  );
}
