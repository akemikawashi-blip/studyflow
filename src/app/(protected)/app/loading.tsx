import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function AppLoading() {
  return (
    <PageContainer>
      <LoadingSkeleton className="h-12 w-64" />
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <LoadingSkeleton className="h-44" />
        <LoadingSkeleton className="h-44" />
        <LoadingSkeleton className="h-44" />
        <LoadingSkeleton className="h-44" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <LoadingSkeleton className="h-96" />
        <LoadingSkeleton className="h-96" />
      </div>
    </PageContainer>
  );
}
