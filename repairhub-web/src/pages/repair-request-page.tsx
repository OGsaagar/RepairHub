import { RequestWizard } from "../components/request/request-wizard";
import { PageHeader } from "../components/shared/page-header";

export function RepairRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="New Repair Request" title="Let's fix it." description="This flow is wired to React Hook Form, Zod validation, drag-and-drop uploads, and the same staged lifecycle modeled in the backend." />
      <RequestWizard />
    </div>
  );
}
