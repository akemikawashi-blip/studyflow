import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";

export default function NoteNotFound() {
  return (
    <PageContainer className="max-w-2xl text-center">
      <p className="eyebrow">Caderno</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Anotação não encontrada</h1>
      <p className="mt-3 text-muted-foreground">Ela pode ter sido excluída, ou o link não pertence à sua conta.</p>
      <Link href="/app/notes" className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Voltar ao caderno</Link>
    </PageContainer>
  );
}
