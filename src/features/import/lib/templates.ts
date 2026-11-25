/**
 * Templates transcribed from documents the student provided. They are only
 * loaded into the editable text box; nothing is saved until she confirms.
 */

export const UENP_2027_SOURCE = "UENP 2027";

/** Resolução CEPE/UENP nº 008/2026 — Anexos I, II, IV (Calendário Acadêmico 2027). */
export const UENP_2027_CALENDAR = `# Calendário Acadêmico UENP 2027 — Resolução CEPE/UENP nº 008/2026 (Anexos I, II e IV)
# Formato: DATA (ou DATA a DATA) | título | categoria | observação
# Linhas que começam com # são ignoradas. Apague o # para incluir um item.

# Período letivo e exames (Anexo III)
01/03/2027 | Início das aulas — 1º semestre | aula
03/07/2027 | Término das aulas — 1º semestre | aula
05/07/2027 a 10/07/2027 | Exame final — disciplinas do 1º semestre | prova
05/07/2027 a 24/07/2027 | Recesso acadêmico | recesso
26/07/2027 | Início das aulas — 2º semestre | aula
06/12/2027 | Término das aulas — 2º semestre | aula
07/12/2027 a 13/12/2027 | Exame final — disciplinas anuais e de 2º semestre | prova

# Feriados (Anexo II)
01/01/2027 | Confraternização Universal | feriado
09/02/2027 | Carnaval | feriado
26/03/2027 | Paixão de Cristo | feriado
21/04/2027 | Tiradentes | feriado
01/05/2027 | Dia do Trabalhador | feriado
27/05/2027 | Corpus Christi | feriado | O Anexo II diz 23/05, mas a grade do Anexo I marca 27/05 — confirme com a coordenação
07/09/2027 | Independência do Brasil | feriado
12/10/2027 | Nossa Senhora Aparecida | feriado
02/11/2027 | Finados | feriado
15/11/2027 | Proclamação da República | feriado
20/11/2027 | Dia Nacional da Consciência Negra | feriado
25/12/2027 | Natal | feriado

# Feriados municipais — valem só no município do campus. Apague o # do seu campus.
# 20/01/2027 | Padroeiro de Jacarezinho | feriado | Apenas em Jacarezinho
# 02/04/2027 | Aniversário de Jacarezinho | feriado | Apenas em Jacarezinho
# 15/02/2027 | Aniversário de Cornélio Procópio | feriado | Apenas em Cornélio Procópio
# 01/10/2027 | Padroeira de Bandeirantes | feriado | Apenas em Bandeirantes
# 14/11/2027 | Aniversário de Bandeirantes | feriado | Apenas em Bandeirantes

# Prazos acadêmicos para veteranos (Anexo IV)
19/03/2027 | Matrícula em eletivas, optativas e componentes articuladores | prazo | Também: matrícula em outra turma/turno e pedido de antecipação
31/03/2027 | Aproveitamento de estudos — prazo para veteranos | prazo
30/04/2027 | Renovação de matrícula com multa (Divisão Acadêmica) | prazo
14/05/2027 | Trancamento — disciplinas do 1º semestre (curso semestral) | prazo
13/08/2027 | Ajuste de matrícula em eletivas e optativas (2º semestre) | prazo
31/08/2027 | Edital de vagas ociosas para 2028 | prazo
15/09/2027 | Trancamento — curso seriado anual | prazo
15/10/2027 | Trancamento — 2º semestre (curso semestral) | prazo
03/11/2027 a 30/11/2027 | Renovação de matrícula para 2028 | prazo

# Eventos institucionais (Anexo II) — apague o # para incluir
# 01/03/2027 a 05/03/2027 | Recepção de alunos ingressantes | evento
# 21/06/2027 a 23/06/2027 | PRO-ENSINO — Encontro de Programas e Projetos de Ensino | evento
# 09/11/2027 a 11/11/2027 | XIII Evento de Integração da UENP (CCP) | evento
# 27/11/2027 | Encontro dos Povos e Comunidades Tradicionais do Norte do Paraná | evento
`;

export const UENP_2027_SEMESTERS = [
  { name: "2027.1", start: "2027-03-01", end: "2027-07-03" },
  { name: "2027.2", start: "2027-07-26", end: "2027-12-06" },
];

/** Disciplines from the curriculum image (MED_009–MED_019). */
export const UENP_MED_COURSES = `# Disciplinas da imagem da matriz curricular (MED_009 a MED_019)
# Formato: CÓDIGO | nome | carga horária
# A imagem tem duas colunas de carga horária (ex.: 72 e 60). Aqui está a primeira;
# troque pelos valores da outra coluna se for a que você usa.
# A imagem não mostra o cabeçalho com o período — escolha o semestre acima antes de importar.
MED_009 | Seminário de Disciplinas Básicas Aplicadas I | 18
MED_010 | Bioquímica II | 72
MED_011 | Anatomia Topográfica | 216
MED_012 | Histologia II | 72
MED_013 | Bioestatística | 54
MED_014 | Medicina da Comunidade II | 54
MED_015 | Tutoria II | 18
MED_016 | Seminários de Disciplinas Básicas Aplicadas II | 18
MED_017 | Eletiva I — Informática Médica | 72
MED_018 | Eletiva II — Inglês Acadêmico para a Área da Saúde (produção escrita) | 72
MED_019 | Eletiva III — Língua Brasileira de Sinais (Libras) | 72
`;
