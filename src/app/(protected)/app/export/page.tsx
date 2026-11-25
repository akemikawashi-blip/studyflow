import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ExportManager } from "@/features/export/components/export-manager";

export default function ExportPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Data export & PDF tools"
        description="Download your Atlas Acadêmico records or turn a text-based study PDF into a shorter downloadable summary."
      />
      <div className="mt-7">
        <ExportManager />
      </div>
    </PageContainer>
  );
}
