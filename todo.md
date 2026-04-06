# CÓRTEX — Project TODO

## Design System & Base
- [x] CSS variables (paleta preto/branco, tipografia)
- [x] Google Fonts: Bebas Neue, DM Mono, DM Sans
- [x] Grain overlay SVG (feTurbulence, position fixed)
- [x] Cursor personalizado (círculo branco 12px)
- [x] Scrollbar customizada (4px, track #111, thumb #333)
- [x] Seleção de texto: bg branco, texto preto
- [x] Animações globais: fadeUp, fadeIn, slideDown, blink
- [x] ThemeProvider dark

## Landing Page (/)
- [x] Hero 100vh — CÓRTEX, tagline, linha horizontal, indicador de scroll
- [x] Manifesto editorial (fadeUp no scroll)
- [x] Coluna vertebral vertical (1-2px, opacity 0.2) com marcador animado por scrollY
- [x] IntersectionObserver para reveal de frames (threshold 0.2)
- [x] Frame 01 — ARQUIVO (link funcional /arquivo)
- [x] Frame 02 — PALCO (em breve, opacity 0.4)
- [x] Frame 03 — placeholder (em breve, opacity 0.4)
- [x] Alternância de layout ímpar/par (texto esq/dir)
- [x] Parallax leve nos frames
- [x] Footer CÓRTEX © 2026

## Módulo ARQUIVO (/arquivo)
- [x] Header sticky com ← CÓRTEX, título ARQUIVO, badge contador dinâmico
- [x] Botões: Limpar novos, Adicionar, API Keys
- [x] Grid responsivo: minmax(290px, 1fr), gap 2px
- [x] Label acima da galeria
- [x] BASE_PROMPTS array (13 cards fixos)
- [x] IMG array (13 placeholders #1a1a1a)
- [x] Renderização de cards base + userItems (localStorage)
- [x] Anatomia completa do card:
  - [x] Imagem aspect-ratio 3:4 com badge número e btn delete (userItems)
  - [x] Vehicle name (Bebas Neue 17px)
  - [x] Tags pills (DM Mono 9px)
  - [x] Prompt preview colapsável com gradiente fade
  - [x] Botões: Editar Prompt, Ver tudo
  - [x] Edit Panel: textarea, Gerar (Anthropic), Copiar
  - [x] Freepik Bar: Melhorar, Gerar, Upscale, Animar
  - [x] Painéis Freepik colapsados
- [x] Integração Anthropic API (melhorar prompt via textarea)
- [x] Integração Freepik Mystic (geração de imagem)
- [x] Integração Freepik Upscale
- [x] Integração Freepik Kling (animação)
- [x] Polling helper para tasks assíncronas
- [x] Upload Modal com drag-and-drop
- [x] Reverse-engineer de prompt via Anthropic Vision
- [x] Salvar card na galeria (localStorage)
- [x] Settings Modal (API keys Anthropic + Freepik)
- [x] Toast notifications
- [x] Thinking dots (loading state)
- [x] deleteCard() com animação scale(.95)
- [x] clearUserItems()
- [x] localStorage: apg_items_v2, apg_fp_key, apg_claude_key

## Back-end (tRPC)
- [x] Rota pública para proxy de Anthropic API (evitar CORS)
- [x] Rota pública para proxy de Freepik API
- [x] Rota de polling de tasks Freepik

## Responsividade
- [x] Hero: 130px desktop / 64px mobile
- [x] Frames: alternado desktop / empilhado mobile
- [x] Grid galeria: minmax(290px) desktop / 1fr mobile
- [x] Header botões: texto+ícone desktop / ícone mobile
- [x] Modais: max 560px desktop / 100% mobile

## Testes
- [x] Vitest: rotas de proxy Anthropic e Freepik
- [x] Vitest: funções utilitárias de localStorage

## Refinamentos v2
- [x] Hero menor (70vh) com frase "Ferramentas para quem cria..." mais acima
- [x] Coluna vertebral visível e mais chamativa no fundo da landing page
- [x] Módulos revelados progressivamente por scroll (um de cada vez, não todos visíveis)
- [x] Design mais impactante: mais contraste, elementos visuais mais presentes
- [x] Botão "Adicionar Imagem" dentro da galeria ARQUIVO
- [x] Upload de imagem com geração automática de prompt via Anthropic Vision
- [x] Card adicionado aparece imediatamente na galeria após upload

## Refinamentos v3
- [x] Transição animada de página (wipe overlay) ao navegar entre landing e módulos

## Bugs v3
- [x] Erro "Failed to fetch" na geração de imagem Freepik (CORS — chamadas diretas do browser bloqueadas)

## NEXUS + PULSO (v5)
- [x] CSS variables --nexus-rank-1 a --nexus-rank-7 + animações xpGain, rankUp, agentCelebrate, pulsoTick, glowPulse
- [x] Contexto global NexusContext (loadNexus, saveNexus, addXP, calcReward, getCurrentRank, renderAgent)
- [x] Widget PULSO global (timer Pomodoro, controles, overlay de conclusão, streak)
- [x] Badge NEXUS no header de todas as páginas (Home, Arquivo)
- [x] Frame 00 NEXUS na landing page (módulo especial com AGENTE colorido)
- [x] Página /nexus: AGENTE SVG full, nome editável, rank, XP bar, glifos
- [x] Página /nexus: Stats grid (6 métricas)
- [x] Página /nexus: Activity grid (30 células)
- [x] Página /nexus: Conquistas (12, bloqueadas/desbloqueadas)
- [x] Página /nexus: Loja com tabs Aparência/Funcionalidades + compra com glifos
- [x] Hooks XP no ARQUIVO: imagem_salva + imagesGenerated
- [x] Multiplicador ×1.2 quando PULSO ativo durante uso de ferramenta
- [x] Rota /nexus no App.tsx
- [x] Responsividade mobile do widget PULSO (bottom sheet)

## Auth + Admin + Dashboard (v6)

### Banco de Dados
- [x] Tabela `cortex_sessions` (sessões Pomodoro)
- [x] Tabela `cortex_tasks` (tarefas criadas)
- [x] Tabela `cortex_tool_events` (log de uso das ferramentas)
- [x] Tabela `cortex_weekly_insights` (cache de insights IA)
- [x] Estender tabela `users` com campos NEXUS (xp, glifos, rank_id, agent_name, etc.)

### Auth & Rotas Protegidas
- [x] Página /login com Manus OAuth (usa OAuth nativo do Manus)
- [x] Rota /dashboard protegida (requireAuth)
- [x] Rota /admin protegida (requireAdmin — role=admin)
- [x] Sincronizar estado NEXUS com banco ao login

### Dashboard (/dashboard)
- [x] Header com navegação de semana (← →)
- [x] Cards de resumo: foco, sessões, tarefas, XP
- [x] Gráfico de barras SVG por dia da semana
- [x] Mapa de calor (30 dias)
- [x] Linha do tempo de sessões
- [x] Foco por ferramenta (ARQUIVO, PALCO)
- [x] Insight IA semanal (Anthropic, discreto, com cache)
- [x] Ranking com toggle de visibilidade
- [ ] Modo Sprint (meta semanal + progresso) — próxima iteração
- [ ] Metas de foco (diária + semanal editáveis) — próxima iteração
- [ ] Exportação PDF do relatório mensal (jsPDF) — próxima iteração

### Painel Admin (/admin)
- [x] Seção: manipulação de XP e Glifos (manual + botões rápidos)
- [x] Simulação de sessões em lote (1, 5, 20)
- [x] Tabela de usuários com ações (resetar XP)
- [x] Painel de estatísticas gerais do sistema

### Integração NEXUS ↔ Banco
- [x] saveSession() ao completar/abandonar PULSO (via tRPC)
- [x] saveToolEvent() ao gerar prompt/imagem no ARQUIVO (via tRPC)
- [x] loadUserProfile() ao iniciar sessão (sobrescreve localStorage)
- [x] saveUserProgress() ao atualizar XP/glifos (sync background debounced)

## Login + Admin Desbloqueado (v7)
- [x] Página /login com design editorial CÓRTEX e Manus OAuth
- [x] Botão login/logout no header global (Home, Arquivo)
- [x] Admin: botão "DESBLOQUEAR TUDO" (todas conquistas + itens da loja)
- [x] Admin: botão "XP MÁXIMO" (30000 XP → rank CÓRTEX)
- [x] Admin: botão "GLIFOS MÁXIMOS" (9999 glifos)
- [x] Admin: botão "RESETAR TUDO" (zerar XP, glifos, conquistas, compras)
- [x] Admin: botão "SIMULAR SESSÕES" melhorado com feedback visual
- [x] Admin: seção "ESTADO ATUAL" mostrando XP, rank, glifos, conquistas em tempo real
- [x] Redirecionar /admin para login se não autenticado (guard interno)

## Loja NEXUS — Ativar/Desativar (v8)
- [x] Separar `purchases` (comprados) de `activeItems` (ativados) no NexusContext
- [x] Função `toggleItem(id)` para ativar/desativar itens comprados
- [x] Persistir `activeItems` no banco de dados (coluna JSON na tabela users)
- [x] UI da loja: botão "ATIVAR" / "DESATIVAR" por item comprado
- [x] UI da loja: estado visual claro — comprado+ativo, comprado+inativo, não comprado
- [x] Painel "EQUIPADO" no topo da loja mostrando o que está ativo
- [x] AGENTE reflete imediatamente as mudanças de aparência ao ativar/desativar

## PULSO Reposicionado + ROTA (v9)

### Banco de Dados
- [x] Colunas ROTA em `cortex_tasks`: original_deadline, current_deadline, deadline_changed, bonus_eligible, archived_at, display_order

### Back-end tRPC (ROTA)
- [x] `rota.list` — listar tasks pendentes do usuário
- [x] `rota.history` — listar tasks concluídas com filtro semana/mês/tudo
- [x] `rota.create` — criar task com original_deadline imutável
- [x] `rota.complete` — completar task, calcular recompensa, creditar XP/glifos
- [x] `rota.changeDeadline` — alterar prazo e marcar bonus_eligible = false
- [x] `rota.delete` — deletar task

### PULSO — Reposicionamento
- [x] Mover PULSO do canto inferior direito para o header (GlobalHeader)
- [x] Timer inline no botão do header quando ativo
- [x] Pop-up com aba ROTA integrada
- [x] sessionStorage para persistir estado do timer entre navegações

### ROTA — Sistema de Tasks
- [x] Aba ROTA no popup do PULSO (form de nova task + lista)
- [x] Recompensas condicionais: XP+glifos só se dentro do prazo original
- [x] Tasks atrasadas em vermelho (overdue)
- [x] Badge com count de tasks pendentes no botão do header
- [x] Alterar prazo cancela bônus imediatamente

### Header Global
- [x] Componente GlobalHeader com PULSO + ROTA + NexusBadge + login/logout
- [x] Integrado em Home, Arquivo, Nexus, Dashboard, Admin

### Dashboard — Integração ROTA
- [x] Seção de tasks da semana no Dashboard (pendentes + histórico)

## SAPO — Sistema de Agentes Visuais (v10)
- [x] Upload dos 3 PNGs para CDN (base.png, skin-espada.png, skin-mago.png)
- [x] CSS global: sapoRespira, sapoFocado, sapoCelebra, .sapo-wrapper, .sapo-img, .sapo-blink-overlay
- [x] Componente SapoAgent.tsx com piscar aleatório via useEffect + setTimeout
- [ ] Integrar SapoAgent na landing page (seção NEXUS, 280×340px, respirar+piscar) — próxima iteração
- [ ] Integrar SapoAgent no GlobalHeader (32×40px, estático) — próxima iteração
- [ ] Integrar SapoAgent no widget PULSO (48×58px, respirar, sapo-focado ao iniciar) — próxima iteração
- [x] Integrar SapoAgent na página /nexus (160px, respirar+piscar, skin ativa)
- [x] activeSkin no NexusContext (base|espada|mago) + persistência localStorage
- [x] Skins na loja /nexus: cards com preview, compra, equipar, desequipar
- [x] toggleItem() para skins exclusivas (só uma ativa por vez)
- [x] Ajuste visual do overlay de piscar via CSS (top/height/left/right ajustáveis)
- [x] prefers-reduced-motion: animation none
- [x] Animação celebrate ao comprar item na loja

## Correções SAPO v10.1
- [x] Re-upload PNGs corrigidos (skin-mago e base estavam invertidos)
- [x] Ativar animações CSS no SapoAgent (sapoRespira, sapoFocado, sapoCelebra via inline style)
- [x] SAPO em destaque no topo da página /nexus (hero section 280px)
- [x] Uniformizar tamanho dos cards de skin na loja (grid 3 colunas, aspect-ratio 3:4)
- [x] Aumentar tipografia base em 2pt globalmente (html font-size: 16px)
- [x] Substituir SVG genérico pelo SapoAgent PNG na landing page (seção NEXUS)
- [x] Corrigir estrutura @layer components no index.css (chaves desbalanceadas)

## Grande Atualização v11
- [x] Corrigir SapoAgent: keyframes globais, piscar via scaleY (sem overlay preto)
- [x] Splash screen: SAPO animado + CÓRTEX + barra de progresso (sessionStorage, 1x/dia)
- [x] Redesign hero NEXUS na landing: SAPO 280px, glow radial do rank, grade sutil
- [x] Level-up cinematográfico: RankUpOverlay fullscreen, SAPO sapoCelebra, partículas brancas
- [x] Perfil público /agente/:id: skin ativa, rank, XP, conquistas, link compartilhável
- [x] Animações de entrada: nexusSapoDrop (NEXUS), pageRevealFade (DASH)
- [x] Toast de conquista: ícone + nome Bebas Neue + SAPO miniatura sapoCelebra
- [x] Sistema automático de 14 conquistas no addXP (rank, foco, prompts, streak, imagens)

## Redesign ROTA Popup (v12)
- [x] Popup ROTA → painel lateral slide-in da direita (380px, altura 100vh)
- [x] Header do painel: título ROTA em Bebas Neue 28px, contador de pendentes, botão fechar
- [x] Tabs PENDENTES / HISTÓRICO com linha ativa animada
- [x] Empty state elegante com ícone ◈ e CTA
- [x] Card de task: título, dificuldade colorida com borda esquerda, prazo, botão completar
- [x] Formulário nova task inline expansível (não modal separado)
- [x] Animação de entrada do painel (rotaPanelSlideIn)
- [x] Backdrop semitransparente com blur ao abrir o painel
- [x] Hover states nos botões de ação (editar prazo, remover task)

## Correções ROTA v12.1
- [x] Bug de timezone: parseLocalDate() usa new Date(y, m-1, d, 12) para evitar UTC offset
- [x] Substituir window.prompt() por card de edição inline (título, dificuldade, data)
- [x] Endpoint rota.update no servidor (título + dificuldade + prazo)
- [x] Aviso visual ⚠ ALTERAR PRAZO CANCELA O BÔNUS quando data muda

## Bug Data ROTA v12.2
- [x] Corrigir definitivamente timezone: dateValToStr() + formatDeadline() + isOverdue() sem new Date(string)
- [x] todayStr() usa componentes locais (getFullYear/getMonth/getDate) sem toISOString()
- [x] 5 pontos de conversão corrigidos no GlobalHeader

## Módulo VERSO (v13)
- [x] Schema Drizzle: tabelas verso_brand_voice e verso_texts
- [x] Migration SQL executada no banco
- [x] db-verso.ts: helpers de banco (CRUD brand_voice e texts)
- [x] Router tRPC verso: getBrandVoice, saveBrandVoice, generate, refine, variations, saveText, getLibrary, updateText, deleteText
- [x] Página /verso com layout sidebar + gerador + biblioteca + modais
- [x] 8 templates VERSO_TEMPLATES (Redes Sociais, Publicidade, Apresentações, Email/CRM)
- [x] Integração LLM via invokeLLM (não chamada direta Anthropic)
- [x] XP e glifos ao gerar e salvar texto (+30 XP gerar, +10 XP refinar, +5 XP salvar)
- [x] VERSO no header global (nav pill)
- [x] VERSO na landing page (frame módulo)
- [x] Rota /verso registrada no App.tsx
- [x] GlobalHeader integrado na página VERSO com layout correto (sticky sub-header)

## Correções VERSO v13.1
- [x] Cursor personalizado ausente na página /verso (adicionar CustomCursor)
- [x] Frame do módulo VERSO na landing page (como ARQUIVO e NEXUS)

## Correções v13.2
- [x] Cursor personalizado ausente no Dashboard (adicionar CustomCursor + GrainOverlay)
- [x] Header global: remover nav pills de módulos (ARQUIVO, NEXUS, VERSO), manter apenas DASH no lado esquerdo

## Módulo FORMA (v14)
- [x] Schema Drizzle: tabelas forma_briefings, forma_responses, forma_followups
- [x] Migration SQL executada no banco
- [x] db-forma.ts: helpers de banco (CRUD briefings, responses, followups)
- [x] Router tRPC forma: list, create, get, send, delete, submitResponses, generateAnalysis, addFollowup, getQuestionsBank, getByToken
- [x] Banco de perguntas FORMA_QUESTIONS_BANK (7 categorias: identidade_visual, naming, campanha, social_media, publicidade, email_marketing, universal)
- [x] Página /forma com lista de briefings e filtros por status
- [x] Fluxo de criação em 3 passos (projeto, perguntas, identidade visual) integrado na página /forma
- [x] Página /forma/:id com visão geral, respostas, análise IA e perguntas de acompanhamento
- [x] Página pública /b/:token (formulário do cliente, sem auth, branding dinâmico)
- [x] Formulário do cliente: uma pergunta por vez, navegação por teclado, progresso
- [x] Análise IA sob demanda (resumo executivo, conceito criativo, próximos passos)
- [x] XP rewards: +20 XP criar briefing, +35 XP gerar análise
- [x] FORMA no header global (currentPage='forma') e na landing page (frame módulo 03)
- [x] Rotas /forma, /forma/:id, /b/:token registradas no App.tsx
- [x] Numeração dos frames atualizada: FORMA=03, PALCO=05, ESTÚDIO=06

## Integração IA (v15)
- [x] Todos os módulos (VERSO, FORMA, Dashboard) já usam invokeLLM (GPT-4o via Manus)
- [x] ARQUIVO usa proxy Anthropic separado (chave do usuário, intencional)
- [x] Decisão: manter invokeLLM (sem custo extra, já usa GPT-4o)

## Bug ARQUIVO — API Key (v15.1)
- [x] Corrigir erro "invalid x-api-key" ao gerar prompt no ARQUIVO
- [x] Substituir proxy Anthropic direto pelo invokeLLM (sem precisar de chave do usuário)
- [x] Ajustar frontend para não exigir chave Anthropic para melhorar/gerar prompts
- [x] Novos endpoints: trpc.arquivo.editPrompt e trpc.arquivo.reverseEngineer (invokeLLM)

## Bug FORMA — briefingId undefined (v15.2)
- [x] Corrigir erro "briefingId: undefined" na mutation do FORMA
- [x] Causa: cast errado do insertId (mysql2 retorna array, não objeto direto)
- [x] Corrigido db-forma.ts e db-verso.ts: usar result[0].insertId
