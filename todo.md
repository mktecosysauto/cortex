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
