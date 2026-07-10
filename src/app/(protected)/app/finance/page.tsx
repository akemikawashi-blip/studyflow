import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { FinanceManager } from "@/features/finance/components/finance-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function FinancePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: transactions, error: transactionError }, { data: budgets, error: budgetError }, { data: preferences }] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(1000),
    supabase.from("budgets").select("*").eq("user_id", user.id).order("budget_month", { ascending: false }),
    supabase.from("user_preferences").select("currency_code").eq("user_id", user.id).maybeSingle(),
  ]);
  const error = transactionError || budgetError;

  return (
    <PageContainer>
      <PageHeader title="Finance" description="Record income and expenses, create monthly budgets, and see live spending calculations." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Finance data could not be loaded.</p><p className="mt-1 text-sm">Confirm that the complete database migration is installed.</p></div> : <div className="mt-7"><FinanceManager transactions={transactions ?? []} budgets={budgets ?? []} defaultCurrency={preferences?.currency_code ?? "BDT"} /></div>}
    </PageContainer>
  );
}
