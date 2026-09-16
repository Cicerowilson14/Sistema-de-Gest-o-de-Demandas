# Chamados TI — Faculdade Cecape

Sistema interno de gestão de demandas do setor de TI. Nasceu de uma planilha compartilhada que não dava mais conta: chamado chegava por WhatsApp, por e-mail, no corredor, e ninguém sabia direito o que já tinha sido resolvido nem quem tinha pegado o quê.

Hoje são duas frentes na mesma base de dados:

- **Painel da TI** — quadro kanban, atribuição de responsáveis, relatórios e histórico.
- **Portal do solicitante** — professor/coordenador pede o equipamento e acompanha o andamento sem precisar ligar pra gente.

---

## Stack

HTML, CSS e JavaScript puro. Sem framework, sem build, sem `npm install`.

A escolha foi consciente: o sistema roda em máquinas antigas da faculdade e precisa abrir direto do navegador sem servidor. Qualquer pessoa do setor consegue mexer sem montar ambiente.

Bibliotecas via CDN (só no painel da TI):

| Lib | Pra quê |
|---|---|
| Chart.js | Gráficos do dashboard |
| SheetJS (xlsx) | Exportar o histórico em Excel |
| html2pdf.js | Exportar o relatório em PDF |

Fontes: Sora (títulos) e Inter (corpo), via Google Fonts.

---

## Estrutura

```
.
├── tema.css        # design system: cores, tipografia, botões, campos, modal, tabelas
│
├── login.html      # acesso restrito da equipe de TI
├── login.css
├── login.js
│
├── index.html      # painel interno: kanban + relatórios
├── index.css
├── main.js
│
├── portal.html     # portal do solicitante (login + acompanhamento)
├── portal.css
└── portal.js
```

**`tema.css` é obrigatório em todas as páginas.** Ele carrega antes dos CSS específicos e concentra tudo que se repete. Se precisar mudar a cor de acento do sistema inteiro, é uma variável só:

```css
:root {
    --cor-acao: #ff7a45;   /* laranja: ações primárias */
    --cor-info: #16b8a6;   /* verde-água: informação, portal */
}
```

O `portal.html` carrega `tema.css` + `login.css` + `portal.css`, porque reaproveita a tela de acesso inteira do login da TI.

---

## Rodando

Clona e abre o `login.html` no navegador. É isso.

```bash
git clone <url-do-repo>
cd chamados-ti-cecape
```

Se quiser servir via HTTP (recomendado, evita dor de cabeça com caminho relativo em alguns navegadores):

```bash
python3 -m http.server 8000
# http://localhost:8000/login.html
```

Não precisa de banco, backend ou variável de ambiente.

---

## Como funciona

### Fluxo do solicitante

1. Cria conta em `portal.html` (trava de domínio: só `@faculdadececape.edu.br`).
2. Abre uma solicitação informando equipamento, sala, data e horário de uso.
3. A solicitação cai direto no kanban da TI como **Pendente**.
4. Acompanha pela trilha de progresso: Enviado → Em análise → Concluído.
5. Pode editar ou excluir **enquanto estiver em aberto**. Depois de finalizada ou cancelada, trava.

### Fluxo da TI

1. Login em `login.html` (mesma trava de domínio).
2. O quadro mostra as quatro colunas: Pendentes, Em Andamento, Finalizadas, Canceladas.
3. Atribui responsáveis pelo select do cartão, ou clica em **Assumir esta demanda** pra se colocar como responsável.
4. Muda o status pelo select do rodapé do cartão. Ao finalizar ou cancelar, o sistema grava quem fechou e quando, automaticamente.
5. O "×" do cartão **não apaga nada** — só tira do quadro. A demanda continua no histórico.

### Relatórios

Aba **Relatórios & histórico**:

- Taxa de resolução em anel de progresso, mais total, resolvidas em até 24h e resolvidas por mim.
- Rosca com a distribuição de status.
- Barras de desempenho dos resolutores. O select alterna entre consolidado do setor e visão individual (aí quebra por prioridade).
- Histórico completo com exclusão por seleção, por mês, por dia ou geral. **Essa exclusão é permanente**, diferente do "×" do cartão.
- Exportação em `.xlsx` e `.pdf`.

---

## Equipe e contas

A lista de quem aparece no select de responsáveis fica no topo do `main.js`:

```js
const equipeTI = ["TI (Setor)", "Wilson", "Gleydson", "Davy", "Jonatas", "Charles"];
```

Adicionou alguém na equipe? É só incluir no array. O filtro do gráfico de resolutores se monta sozinho a partir daqui.

Contas pré-cadastradas ficam no `login.js`, em `usuariosPadrao`. As criadas pela tela de cadastro vão pro `localStorage`.

---

## Dados

Tudo em `localStorage`. As chaves:

| Chave | Conteúdo |
|---|---|
| `kanban_cards` | Todas as demandas. Base compartilhada entre o painel e o portal |
| `demanda_user` | Sessão ativa da TI |
| `ti_usuarios` | Contas da TI criadas pelo cadastro |
| `portal_usuarios` | Contas dos solicitantes |
| `portal_usuarioLogado` | Sessão ativa do portal |

### Formato de uma demanda

```js
{
  id: "1731024000000",
  title: "Solicitação: Data show",
  description: "Local: Sala 07 | Horário: 14:00 às 16:00\nObs: precisa de cabo HDMI",
  priority: "media",              // baixa | media | alta
  status: "pendente",             // pendente | em_andamento | finalizada | cancelada
  assignee: "Wilson, Davy",       // string separada por vírgula
  deadline: "2026-03-18",
  createdBy: "Maria Souza (Coordenação)",
  createdAt: "2026-03-15T13:20:00.000Z",
  completedBy: null,
  completedAt: null,
  deletedFromBoard: false,        // true = fora do quadro, ainda no histórico
  emailSolicitante: "maria@faculdadececape.edu.br",  // só em demandas do portal
  dataUso: "2026-03-18"                              // só em demandas do portal
}
```

`emailSolicitante` é o que amarra a demanda ao solicitante: é por ele que o portal filtra o que cada usuário vê. `dataUso` é a data em que o equipamento vai ser usado, e aparece destacada em vermelho no cartão da TI porque é o que define a urgência real do chamado.

Demandas criadas direto pelo painel da TI não têm esses dois campos — o código trata a ausência deles.

---

## Convenções de código

Classes, IDs e funções em **português**, nomeados pelo que representam na tela. `.cartao-solicitacao`, `#corpoTabelaHistorico`, `renderizarQuadro()`. A ideia é conseguir abrir o CSS e saber exatamente qual pedaço da interface aquilo mexe, sem ficar caçando.

Estilo de status e prioridade sempre por `data-attribute`, não por classe empilhada:

```html
<div class="cartao-demanda" data-prioridade="alta">
<div class="coluna-kanban" data-status="em_andamento">
```

Cada um define sua própria variável de acento, e o resto do componente lê essa variável. Adicionar um status novo é criar uma linha no CSS, não duplicar bloco.

---

## Limitações conhecidas

Vale ser honesto sobre isso:

- **`localStorage` é por navegador.** Cada máquina tem sua própria cópia dos dados. Dois computadores não enxergam o mesmo quadro. Funciona pro uso atual (uma máquina no setor), mas não escala.
- **Senhas em texto puro.** Não tem hash. É rede interna e o risco foi aceito conscientemente, mas não é modelo pra copiar.
- **Recuperação de senha é simulada.** O código gera e mostra num `alert`. Não sai e-mail nenhum.
- **Sem controle de concorrência.** Duas abas abertas podem sobrescrever uma à outra.

## Próximos passos

- [ ] Migrar pra backend com banco de verdade (a modelagem já está pronta pra isso, os campos não mudam)
- [ ] Hash de senha
- [ ] Notificação por e-mail quando o status muda
- [ ] Drag and drop entre colunas do kanban
- [ ] Anexo de foto no chamado (ajudaria muito nos casos de equipamento com defeito)

---

## Contribuindo

Se for mexer, dois pedidos:

1. Mantém o padrão de nomes em português.
2. Se a mudança envolve cor, espaçamento ou tipografia, vai em `tema.css`. CSS específico de página só pra layout que realmente só existe ali.

---

Setor de TI — Faculdade Cecape
