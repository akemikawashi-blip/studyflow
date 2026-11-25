// End-to-end flows for Atlas Acadêmico, driven through the real UI.
// Run via scripts/e2e/run.sh (it starts Postgres, the Supabase stand-in and Next).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.APP_URL ?? "http://127.0.0.1:3100";
const SHOTS = process.env.SHOTS_DIR ?? "";
const results = [];
let failures = 0;

async function step(name, fn) {
  try {
    await fn();
    results.push(`  ✓ ${name}`);
  } catch (error) {
    failures++;
    if (SHOTS && globalThis.__page) await globalThis.__page.screenshot({ path: path.join(SHOTS, `fail-${failures}.png`), fullPage: true }).catch(() => {});
    results.push(`  ✗ ${name}\n      ${String(error?.message ?? error).split("\n").slice(0, 4).join("\n      ")}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function signUp(page, name, email) {
  await page.goto(`${BASE}/signup`);
  await page.fill('input[name="fullName"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Senha-forte-123");
  await page.fill('input[name="confirmPassword"]', "Senha-forte-123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app/dashboard", { timeout: 20_000 });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
const page = await context.newPage();
globalThis.__page = page;
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(error.message));

let noteUrl = "";

await step("cadastro cria conta e abre o painel com saudação", async () => {
  await signUp(page, "Ana Beatriz Souza", "ana@atlas.test");
  await page.getByRole("heading", { level: 1 }).filter({ hasText: "Ana" }).waitFor();
  await page.getByText("Comece cadastrando suas disciplinas").waitFor();
  await shot(page, "01-painel-vazio");
});

await step("cadastra disciplina (módulo existente preservado)", async () => {
  await page.goto(`${BASE}/app/planner`);
  await page.getByRole("tab", { name: "Courses" }).click();
  await page.fill("#course-code-new", "ANA1");
  await page.fill("#course-name-new", "Anatomia Humana");
  await page.getByRole("button", { name: "Add course" }).click();
  await page.getByText("Anatomia Humana").first().waitFor();
});

await step("captura rápida: registrar aula abre o editor", async () => {
  await page.goto(`${BASE}/app/dashboard`);
  await page.getByRole("button", { name: "Captura rápida" }).click();
  const dialog = page.getByRole("dialog", { name: "Captura rápida" });
  await dialog.locator('input[name="title"]').fill("Sistema urinário — rins");
  await dialog.locator('select[name="courseId"]').selectOption({ label: "Anatomia Humana" });
  await dialog.getByRole("button", { name: "Criar e abrir o editor" }).click();
  await page.waitForURL(/\/app\/notes\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  noteUrl = page.url();
  await page.locator(".atlas-prose").waitFor();
  assert((await page.inputValue("#note-title")) === "Sistema urinário — rins", "título não veio preenchido");
});

await step("editor rico: títulos, negrito, listas, checklist, bloco de conceito e tabela", async () => {
  const editor = page.locator(".atlas-prose");
  await editor.click();
  await page.getByRole("button", { name: "Subtítulo" }).click();
  await page.keyboard.type("Vascularização");
  await page.keyboard.press("Enter");
  await page.keyboard.type("A artéria renal origina-se da aorta abdominal. ");
  await page.getByRole("button", { name: "Negrito" }).click();
  await page.keyboard.type("Ponto-chave");
  await page.getByRole("button", { name: "Negrito" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Lista com marcadores" }).click();
  await page.keyboard.type("Hilo renal");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Pelve renal");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Checklist" }).click();
  await page.keyboard.type("Revisar limites da bexiga");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bloco de conceito importante" }).click();
  await page.keyboard.type("Néfron é a unidade funcional do rim.");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Inserir tabela" }).click();
  await page.keyboard.type("Estrutura");
  await page.getByRole("toolbar", { name: "Formatação" }).waitFor();
  await page.getByRole("button", { name: "+ Linha" }).click();
  assert(await editor.locator("h2", { hasText: "Vascularização" }).count() === 1, "subtítulo ausente");
  assert(await editor.locator("strong", { hasText: "Ponto-chave" }).count() === 1, "negrito ausente");
  assert(await editor.locator('ul[data-type="taskList"]').count() === 1, "checklist ausente");
  assert(await editor.locator(".atlas-callout-concept").count() === 1, "bloco de conceito ausente");
  assert(await editor.locator("table tr").count() === 4, "tabela deveria ter 4 linhas");
});

await step("metadados da aula e campos de estudo", async () => {
  await page.fill("#lesson-professor", "Prof. Carlos Lima");
  await page.fill("#lesson-topic", "Rins e vias urinárias");
  await page.fill("#lesson-unit", "Unidade 3 — Sistema urinário");
  await page.fill("#note-tags", "rim, néfron, artéria renal");
  await page.fill("#memorize", "Limites da bexiga urinária");
  await page.fill("#doubts", "Diferença entre córtex e medula?");
});

await step("salvamento automático conclui", async () => {
  await page.getByText(/Salvo às/).waitFor({ timeout: 15_000 });
});

await step("upload de PDF e imagem para o armazenamento privado", async () => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
  await page.locator('section[aria-labelledby="attachments-title"] input[type="file"]').setInputFiles({ name: "Slides rins.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("link", { name: "Slides rins", exact: true }).waitFor({ timeout: 15_000 });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: "corte-renal.png", mimeType: "image/png", buffer: png });
  await page.locator(".atlas-prose img").waitFor({ timeout: 15_000 });
  const src = await page.locator(".atlas-prose img").getAttribute("src");
  assert(src?.startsWith("/api/files/"), `imagem deveria usar a rota privada, veio ${src}`);
  const response = await page.request.get(`${BASE}${src}`);
  assert(response.ok() && (response.headers()["content-type"] ?? "").startsWith("image/png"), "imagem não pôde ser lida pela dona");
  await page.getByText(/Salvo às/).waitFor({ timeout: 15_000 });
  await shot(page, "02-editor");
});

await step("recarregar a página recupera todo o conteúdo", async () => {
  await page.reload();
  const editor = page.locator(".atlas-prose");
  await editor.locator("h2", { hasText: "Vascularização" }).waitFor();
  assert(await editor.locator(".atlas-callout-concept").count() === 1, "bloco de conceito perdido");
  assert(await editor.locator("table").count() === 1, "tabela perdida");
  assert(await editor.locator("img").count() === 1, "imagem perdida");
  assert((await page.inputValue("#lesson-professor")) === "Prof. Carlos Lima", "professor perdido");
  assert((await page.inputValue("#memorize")) === "Limites da bexiga urinária", "campo memorizar perdido");
  assert((await page.inputValue("#note-tags")).includes("artéria renal"), "palavras-chave perdidas");
  assert(await page.getByRole("link", { name: "Slides rins", exact: true }).count() === 1, "anexo perdido");
});

await step("editar depois sem perder conteúdo", async () => {
  const editor = page.locator(".atlas-prose");
  await editor.locator("h2", { hasText: "Vascularização" }).click();
  await page.keyboard.press("End");
  await page.keyboard.type(" e drenagem");
  await page.getByText(/Salvo às/).waitFor({ timeout: 15_000 });
  await page.reload();
  await page.locator(".atlas-prose h2", { hasText: "Vascularização e drenagem" }).waitFor();
  assert(await page.locator(".atlas-prose table").count() === 1, "tabela perdida após edição");
});

await step("caderno lista, filtra e agrupa as anotações", async () => {
  await page.goto(`${BASE}/app/notes`);
  await page.getByRole("link", { name: "Sistema urinário — rins" }).waitFor();
  await page.goto(`${BASE}/app/notes?view=professor`);
  await page.getByRole("heading", { name: /Prof\. Carlos Lima/ }).waitFor();
  await page.goto(`${BASE}/app/notes?view=keyword`);
  await page.getByRole("heading", { name: /néfron/ }).waitFor();
  await page.goto(`${BASE}/app/notes?q=ARTERIA%20RENAL`);
  await page.getByRole("link", { name: "Sistema urinário — rins" }).waitFor();
  await page.goto(`${BASE}/app/notes?q=termo-inexistente-xyz`);
  await page.getByText("Nenhuma anotação corresponde aos filtros.").waitFor();
  await page.goto(`${BASE}/app/notes`);
  await shot(page, "03-caderno");
});

await step("busca global encontra conteúdo, campos de estudo e materiais sem acentos", async () => {
  await page.goto(`${BASE}/app/search?q=arteria%20renal`);
  await page.locator("mark", { hasText: /art[ée]ria/i }).first().waitFor();
  await page.goto(`${BASE}/app/search?q=bexiga`);
  await page.getByRole("link", { name: /Sistema urinário — rins/ }).first().waitFor();
  await page.goto(`${BASE}/app/search?q=slides%20rins`);
  await page.getByText("Material", { exact: true }).first().waitFor();
  await shot(page, "04-busca");
});

await step("painel mostra a aula recente e a disciplina com contagem", async () => {
  await page.goto(`${BASE}/app/dashboard`);
  await page.getByRole("link", { name: /Sistema urinário — rins/ }).first().waitFor();
  await page.getByText("1 anotação").waitFor();
  await page.getByText("Minha semana acadêmica").waitFor();
  await page.getByText("Preciso resolver").waitFor();
  await shot(page, "05-painel");
});

// ---------------------------------------------------------------- isolation
const otherContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR" });
const other = await otherContext.newPage();
await step("outra conta não vê a anotação, os arquivos nem os resultados de busca", async () => {
  await signUp(other, "Outra Pessoa", "outra@atlas.test");
  await other.goto(noteUrl);
  await other.getByText("Anotação não encontrada").waitFor();
  await other.goto(`${BASE}/app/search?q=renal`);
  await other.getByText(/Nada encontrado/).waitFor();
  const src = await page.goto(noteUrl).then(() => page.locator(".atlas-prose img").getAttribute("src"));
  const response = await other.request.get(`${BASE}${src}`, { maxRedirects: 0 });
  assert(response.status() === 404, `arquivo de outra conta deveria dar 404, deu ${response.status()}`);
});
await otherContext.close();

await step("excluir anexo e anotação pede confirmação e remove", async () => {
  await page.goto(noteUrl);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir Slides rins" }).click();
  await page.getByRole("link", { name: "Slides rins", exact: true }).waitFor({ state: "detached" });
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Excluir anotação" }).click();
  await page.waitForTimeout(500);
  assert(page.url() === noteUrl, "cancelar a confirmação não deveria excluir");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir anotação" }).click();
  await page.waitForURL("**/app/notes", { timeout: 15_000 });
  await page.getByText("Seu caderno está vazio").waitFor();
});

// ---------------------------------------------------------------- mobile
const phone = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR" });
const mobile = await phone.newPage();
await step("iPhone: entrar, painel sem rolagem horizontal, navegação inferior e editor", async () => {
  await mobile.goto(`${BASE}/login`);
  await mobile.fill('input[name="email"]', "ana@atlas.test");
  await mobile.fill('input[name="password"]', "Senha-forte-123");
  await mobile.click('button[type="submit"]');
  await mobile.waitForURL("**/app/dashboard", { timeout: 20_000 });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `painel com rolagem horizontal de ${overflow}px`);
  await mobile.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Caderno" }).click();
  await mobile.waitForURL("**/app/notes");
  await mobile.getByRole("button", { name: "Nova anotação" }).first().click();
  await mobile.locator('dialog input[name="title"]').fill("Embriologia — gastrulação");
  await mobile.getByRole("button", { name: "Criar e abrir o editor" }).click();
  await mobile.waitForURL(/\/app\/notes\/[0-9a-f-]{36}$/);
  await mobile.locator(".atlas-prose").click();
  await mobile.keyboard.type("Formação das três camadas germinativas.");
  await mobile.getByText(/Salvo às/).waitFor({ timeout: 15_000 });
  const editorOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(editorOverflow <= 1, `editor com rolagem horizontal de ${editorOverflow}px`);
  await shot(mobile, "06-iphone-editor");
  await mobile.goto(`${BASE}/app/dashboard`);
  await mobile.getByText("Minha semana acadêmica").waitFor();
  await shot(mobile, "07-iphone-painel");
});

await step("sem erros de JavaScript no navegador", async () => {
  assert(consoleErrors.length === 0, consoleErrors.join("\n"));
});

await browser.close();
console.log(results.join("\n"));
console.log(failures === 0 ? `\nTodos os ${results.length} fluxos passaram.` : `\n${failures} de ${results.length} fluxos falharam.`);
process.exit(failures === 0 ? 0 : 1);
