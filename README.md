# Atlas Acadêmico

Sistema pessoal de organização acadêmica para a graduação em Medicina, construído sobre a base StudyFlow (Next.js 16, React 19, TypeScript, Tailwind CSS 4 e Supabase com autenticação, Row Level Security e Storage).

Os dados ficam no Supabase da própria usuária: sincronizam entre celular, tablet e computador, com cada registro protegido por RLS. Não há dados de exemplo — tudo o que aparece vem do que você cadastra.

## O que já funciona (Etapa 1)

- **Identidade visual**: azul-marinho, verde-sálvia, papel bege, dourado envelhecido; títulos em serifa (Newsreader) e texto em Inter; modo claro/escuro.
- **Navegação** em português, organizada por seções, com menu inferior no celular.
- **Painel**: saudação e data no fuso da usuária, resumo da semana, *Minha semana acadêmica* (aulas da grade, provas, entregas, eventos e tarefas), *Preciso resolver* (atrasos, provas em até 7 dias, entregas em até 3 dias), próximas provas, trabalhos pendentes, calendário do mês, aulas recentes, disciplinas em andamento e progresso de estudos vs. meta.
- **Captura rápida** (botão +): registrar uma aula em segundos de qualquer página.
- **Caderno digital**: cada anotação pode ser uma aula (disciplina, data, professor, assunto, unidade temática), com editor rico — títulos, negrito/itálico/sublinhado, destaque, listas, checklists, tabelas, citações, blocos de *Observação*, *Conceito importante* e *Correlação clínica*, imagens (inclusive colar/arrastar) e anexos. Campos de estudo: pontos importantes, preciso memorizar, dúvidas, observações do professor, referências e palavras-chave.
- **Salvamento automático** com indicador, nova tentativa em caso de falha e rascunho local de segurança (se a conexão cair, o texto pode ser recuperado no mesmo aparelho).
- **Visualização do caderno** por disciplina, data, assunto, professor ou palavra-chave, com filtros e busca no texto completo.
- **Arquivos** (PDF, slides, fotos, documentos — até 50 MB) em bucket **privado**; cada usuária só acessa a própria pasta, e os links passam por `/api/files/…`, que confere a sessão antes de gerar uma URL assinada de 60 segundos.
- **Busca global** sem diferenciar acentos/maiúsculas em anotações, aulas, disciplinas, materiais, provas, trabalhos, tarefas, eventos, estudos, habilidades e finanças, com trecho destacado.
- **Disciplinas** (Etapa 2): semestres (com semestre atual), criar/editar/arquivar/restaurar/reordenar/excluir disciplinas; página própria de cada disciplina com horários, próximas avaliações, conteúdo programático, livros e referências, dificuldades, conteúdos a revisar, histórico de aulas, materiais, avaliações com nota e trabalhos.
- **Biblioteca de materiais** (Etapa 2): envio de vários arquivos, links e referências; vínculo com disciplina, aula e avaliação; filtros por categoria, disciplina, tipo e data; visualização de PDF e imagens; edição e exclusão.
- **Calendário** (Etapa 2): visões mensal, semanal, diária e lista; compromissos com categoria (aula, prova, seminário, entrega, apresentação, reunião, evento universitário, prazo de projeto, atividade extracurricular…), disciplina, horário e descrição; reúne também provas, trabalhos, tarefas e a grade semanal de aulas (respeitando as datas do semestre); alertas de atraso e de prazo em até 3 dias.
- Módulos herdados continuam funcionando (Disciplinas e prazos, Horários e provas, Tarefas, Estudos, Desempenho semestral, Finanças, Habilidades, Notificações, Exportação, Configurações). Eles ainda têm textos em inglês e serão adaptados nas próximas etapas.

## Atualizar o banco (obrigatório)

- **Projeto Supabase já existente**: abra *SQL Editor*, cole todo o `supabase/atlas-upgrade.sql` e clique em *Run*. É aditivo e pode ser executado mais de uma vez; não apaga nem duplica dados.
- **Projeto novo**: rode `supabase/phase2-complete.sql` (já inclui a atualização).
- Pela CLI: `npm run db:push`.

O arquivo é cumulativo (Etapas 1 e 2). A Etapa 1 cria as tabelas `lessons` e `materials`, acrescenta colunas ao caderno (`notes`) e às disciplinas (`courses.archived`, `courses.sort_order`), cria o bucket privado `atlas-files` com políticas por usuária e a função de busca `atlas_search`. A Etapa 2 transforma `academic_semesters` em semestres (datas e semestre atual; a nota GPA passa a ser opcional), liga disciplinas a semestres, acrescenta os campos da disciplina, liga materiais a provas e adiciona as novas categorias de compromisso. Novas contas passam a usar fuso `America/Sao_Paulo` e moeda BRL; contas existentes mantêm suas preferências (ajuste o fuso em Configurações se o painel avisar).

## Testes

```bash
npm run check      # lint + typecheck + build
npm run test:db    # aplica todas as migrações num PostgreSQL descartável e testa RLS, Storage e busca
npm run test:e2e   # fluxos completos no navegador (Playwright) contra PostgreSQL real
```

`test:e2e` usa `scripts/e2e/fake-supabase.mjs`, um dublê local da API do Supabase que executa as consultas no PostgreSQL real como o papel `authenticated` — ou seja, o RLS real decide o acesso. Autenticação e Storage são simulados (as políticas reais do Storage são verificadas em `test:db`). Requer binários do PostgreSQL 15+ e Playwright com Chromium.

## Plano de adaptação

| Etapa | Conteúdo | Situação |
| --- | --- | --- |
| 1 | Arquitetura, identidade visual, navegação, painel, caderno digital, arquivos, busca global | **Concluída** |
| 2 | Página individual por disciplina (horários, conteúdo programático, histórico de aulas, materiais, provas, dificuldades), semestres, arquivar/reordenar, biblioteca de materiais com filtros e visualização de PDF, calendário mensal/semanal/diário/lista | Próxima |
| 3 | Provas e simulados com notas, pesos e erros; calculadora de médias configurável por disciplina; banco de questões e montagem de simulados; flashcards e revisão espaçada com intervalos ajustáveis | Planejada |
| 4 | Tarefas com Kanban e etapas; projetos e iniciação científica; relatórios e histórico por semestre com exportação | Planejada |
| 5 | Caixa de entrada em linguagem natural (classificação sugerida, sempre com confirmação; nunca inventa datas ou disciplinas), automações, importação de backup | Planejada |

Decisões de arquitetura: reaproveitar `courses` como disciplinas, `notes` como caderno e `exam_schedules`/`assignments` para avaliações, ligando tudo a `lessons` (a aula é o ponto de conexão entre anotações, materiais, questões, provas e revisões futuras). Nenhuma tabela existente foi substituída.

---

## Documentação herdada do StudyFlow (base técnica)

StudyFlow is a responsive student productivity web application built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase.

This package converts every visible application module from preview data to authenticated, user-owned database records.

## Dynamic modules included

- Email/password registration, verification, sign-in, sign-out, and password recovery
- Server-protected `/app/*` routes with Supabase cookie sessions
- Dashboard calculations from the signed-in user's live records
- Tasks: create, edit, complete, reopen, filter, and delete
- Planner: course, assignment, and calendar-event CRUD
- Study: working focus timer, manual session logging, editing, deletion, goals, and weekly charts
- Finance: income/expense CRUD, monthly budgets, balances, spending charts, and budget progress
- Skills: create, edit, filter, and delete learning goals
- Notes: create, edit, delete, search, pin, favorite, tag, and connect to courses
- Notifications: automatic task/assignment deadline alerts, mark-read, mark-all-read, and deletion
- Search: live cross-module search across tasks, assignments, courses, notes, skills, study sessions, and transactions
- Settings: persistent profile, currency, time zone, date format, study goals, reminders, and light/dark/system theme
- Class timetable: weekly class entries with course, day, time, room, teacher, notes, editing, and deletion
- Exam schedule: dated exams with course, type, time, room, seat details, notes, editing, and deletion
- GPA and CGPA: semester GPA records with optional credits and automatic credit-weighted overall CGPA
- Data export: private JSON and CSV downloads containing the signed-in student's saved StudyFlow records
- PDF summarizer: upload a text-based PDF, generate a short/standard/detailed local summary, review it, copy it, and download a summarized PDF
- Dynamic unread-notification count in the mobile header
- Empty states and database-error states
- Row Level Security for every user-owned table

Advanced subfeatures such as syllabus editing, recurring-task generation, skill milestones/resources, reading logs, habits, OCR for scanned PDFs, cloud PDF storage, and PWA/offline support remain outside this build.

## Requirements

- Node.js 20.9 or newer
- npm
- A Supabase project
- Internet connection

## 1. Install dependencies

Open Command Prompt inside the folder containing `package.json`:

```bat
npm install
```

## 2. Create a Supabase project

1. Sign in to Supabase.
2. Create a new project.
3. Keep the project dashboard open.

## 3. Create the database

### New installation

The easiest beginner method:

1. In Supabase, open **SQL Editor**.
2. Open `supabase/phase2-complete.sql` from this project.
3. Copy the whole file.
4. Paste it into a new SQL query.
5. Click **Run**.

The SQL file already contains the tables required by all dynamic modules, including constraints, triggers, indexes, views, and Row Level Security policies.

### Upgrading an existing StudyFlow database

If the older Phase 2 database is already installed, do **not** rerun the whole Phase 2 SQL file. Instead:

1. Open **Supabase → SQL Editor**.
2. Open `supabase/phase3-academic-tools.sql` from this project.
3. Copy the complete file, paste it into a new SQL query, and click **Run**.
4. Deploy the updated application.

This creates the timetable, exam schedule, and academic semester tables with Row Level Security.

CLI alternative:

```bat
supabase login
supabase link --project-ref YOUR_PROJECT_REFERENCE
npm run db:push
```

## 4. Add environment variables

Copy `.env.example` to `.env.local`:

```bat
copy .env.example .env.local
```

Open `.env.local` and replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Find the URL and publishable key in the Supabase project's **Connect** or **API settings** screen.

Do not add a service-role key to a browser-facing environment variable.

## 5. Configure authentication URLs

In Supabase Auth URL configuration, use:

```text
Site URL:
http://localhost:3000

Redirect URLs:
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

For production, also add the final deployment domain.

## 6. Start StudyFlow

```bat
npm run dev
```

Open:

```text
http://localhost:3000
```

When Supabase is not configured, StudyFlow opens `/setup` instead of crashing.

## Quality checks

```bat
npm run lint
npm run typecheck
npm run build
```

Run all checks together:

```bat
npm run check
```

This package was verified with all three checks passing.

## Supabase scripts

```bat
npm run supabase:start
npm run supabase:stop
npm run db:reset
npm run db:push
npm run db:types
```

The local Supabase stack requires Docker Desktop.

## Security design

- The browser never supplies trusted ownership information.
- Every Server Action authenticates the current user.
- Every update and deletion filters by both record ID and authenticated user ID.
- Row Level Security provides database-level account isolation.
- The service-role key is not used by normal application code.
- Authentication redirects are restricted to internal paths.
- Password-reset responses do not reveal whether an email exists.
- Notification links are restricted to internal `/app/*` paths before rendering.

## Database files

```text
supabase/
├── phase2-complete.sql
├── migrations/
│   ├── 202607100001_extensions_and_enums.sql
│   ├── 202607100002_tables.sql
│   ├── 202607100003_triggers.sql
│   ├── 202607100004_rls_policies.sql
│   ├── 202607100005_indexes_and_views.sql
│   └── 202607130001_academic_tools.sql
├── phase3-academic-tools.sql
└── seed.sql
```

`seed.sql` is optional development data. It contains a placeholder user UUID and must not be run unchanged.

## Recommended manual test

1. Register and sign in.
2. Add a course, assignment, and calendar event in Planner.
3. Add, edit, complete, reopen, and delete a task.
4. Run the Study timer for a short session and save it.
5. Add an income item, expense item, and monthly budget.
6. Add a skill and a note linked to a course.
7. Open Search and verify the new records appear.
8. Open Notifications after creating a task or assignment due within the next few days.
9. Add weekly classes and an exam in Schedule.
10. Add semester GPA records and confirm CGPA updates.
11. Export JSON and CSV data.
12. Upload a text-based PDF, generate a summary, and download the summarized PDF.
13. Update profile, study goals, currency, and theme in Settings.
14. Refresh each page and verify records remain.
15. Create a second account and confirm it cannot see the first account's records.

## Troubleshooting

### StudyFlow opens the setup page

The project could not read valid Supabase variables. Check `.env.local`, stop the server with `Ctrl+C`, and restart `npm run dev`.

### `relation does not exist`

The SQL migration was not applied, or only part of it ran. Run `supabase/phase2-complete.sql` in the Supabase SQL Editor.

### A module loads but mutations fail

Confirm that the full SQL file was executed, including the RLS policies and grants near the end of the file.

### Verification email does not arrive

Check the Supabase Auth logs, spam folder, email-provider limits, and whether email confirmation is enabled.

### Login succeeds but protected pages redirect back

Confirm the project URL and publishable key belong to the same Supabase project, then clear localhost cookies and sign in again.

### Schedule or GPA page says the database migration is missing

For an existing project, run `supabase/phase3-academic-tools.sql` once in the Supabase SQL Editor. For a brand-new project, run the updated `supabase/phase2-complete.sql`.

### A PDF produces little or no summary

The summarizer reads selectable text. Image-only scanned PDFs require OCR before upload. The current browser tool accepts PDFs up to 20 MB and 120 pages.
