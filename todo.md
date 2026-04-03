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
