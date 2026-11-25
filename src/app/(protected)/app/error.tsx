"use client";

import { RotateCcw } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <PageContainer className="max-w-3xl">
      <ErrorState description="Não foi possível exibir esta página. Seus dados estão salvos — tente novamente." />
      <Button className="mt-4" onClick={reset}>
        <RotateCcw className="size-4" aria-hidden="true" />
        Tentar novamente
      </Button>
    </PageContainer>
  );
}
