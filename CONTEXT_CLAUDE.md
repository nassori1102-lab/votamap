# CandMaps — Contexto para continuação

## Stack
Next.js 16.2.2 App Router + TypeScript + Supabase + Vercel  
Deploy: `npx vercel --prod` → `npx vercel alias set [url] candmaps.vercel.app`  
Estilo: **100% inline CSS** (sem Tailwind)  
Cores: `#0B1F3A` fundo · `#C9A84C` dourado · `#6ba3d6` azul · `#E8EDF5` texto · `#8FA4C0` muted · `#0F2040` cards  
Fontes: Playfair Display (títulos) + IBM Plex Sans  
Hook: `useIsMobile()` em `src/lib/useIsMobile.ts` (breakpoint 768px)  
Supabase anon: `src/lib/supabase.ts` | Service role: só em API routes (`process.env.SUPABASE_SERVICE_ROLE_KEY`)

## Regras de código
- Sempre `'use client'` + `useParams()` para pegar params em páginas dinâmicas
- Upload de arquivo: API route server-side com service role (padrão de `src/app/api/upload/foto-lider/route.ts`)
- Sem Tailwind, sem classes CSS — tudo inline style={{ }}
- `useIsMobile` para responsividade

## Tabelas Supabase (existentes)
- `lideres_regionais`: id, nome, cpf, email, telefone, whatsapp, bairro, cidade, estado, zona_eleitoral, ativo, latitude, longitude, foto_url, meta_votos, criado_em
- `apoiadores`: id, nome, lider_id, engajamento, bairro, cidade, estado, zona_eleitoral, meta_votos (=estimativa votos), criado_em
- `candidatos`: id, nome, partido, cargo, estado, numero_urna, email, telefone, bio, ativo, foto_url, logo_partido_url
- `usuarios`: id, email, perfil → valores: `coordenador` `marketing` `financeiro` `lider`
- `disparos`: id, canal, mensagem, status, audiencia, criado_em
- `creditos_mensagens`: id, canal, total, usado
- `metas_lider`: id, lider_id, data_inicio, data_fim, meta_apoiadores, cidade_foco, observacoes, status

## Tabelas SQL ainda NÃO criadas (pesquisas)
```sql
CREATE TABLE IF NOT EXISTS pesquisas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text NOT NULL, descricao text, slug text UNIQUE NOT NULL, ativa boolean DEFAULT true, criado_em timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS perguntas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pesquisa_id uuid REFERENCES pesquisas(id) ON DELETE CASCADE, texto text NOT NULL, tipo text DEFAULT 'multipla_escolha', obrigatoria boolean DEFAULT true, ordem integer DEFAULT 0);
CREATE TABLE IF NOT EXISTS opcoes_resposta (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pergunta_id uuid REFERENCES perguntas(id) ON DELETE CASCADE, texto text NOT NULL, ordem integer DEFAULT 0);
CREATE TABLE IF NOT EXISTS respostas_pesquisa (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pesquisa_id uuid REFERENCES pesquisas(id), nome text, idade integer, genero text, bairro text, cidade text, criado_em timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS respostas_perguntas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resposta_pesquisa_id uuid REFERENCES respostas_pesquisa(id) ON DELETE CASCADE, pergunta_id uuid REFERENCES perguntas(id), opcao_id uuid REFERENCES opcoes_resposta(id), texto_livre text);
```

## Páginas existentes (todas em src/app/dashboard/)
| Rota | Status |
|------|--------|
| `page.tsx` | Dashboard principal — **FALTA adicionar módulos Pesquisas e Configurações** |
| `candidato/page.tsx` | Perfil + foto + logo partido ✓ |
| `lideres/page.tsx` | Lista com avatar foto ✓ |
| `lideres/[id]/page.tsx` | Edição + upload foto ✓ |
| `lideres/novo/page.tsx` | Cadastro com meta_votos ✓ |
| `apoiadores/page.tsx` | Lista ✓ |
| `apoiadores/[id]/page.tsx` | Edição + estimativa votos ✓ |
| `apoiadores/novo/page.tsx` | Cadastro ✓ |
| `ranking/page.tsx` | Pódio + tabela com fotos ✓ |
| `mapa/page.tsx` | Passa foto_url para MapaComponent ✓ |
| `acompanhamento/page.tsx` | Metas captação por período ✓ |
| `metas/page.tsx` | Previsão de votos ✓ |
| `comunicacao/page.tsx` | SMS/email com créditos e perfis ✓ |
| `equipe/page.tsx` | Gestão de perfis ✓ |
| `pesquisas/page.tsx` | Lista pesquisas ✓ (SQL pendente) |
| `pesquisas/[id]/page.tsx` | Editor perguntas ✓ (SQL pendente) |
| `pesquisas/[id]/resultados/page.tsx` | Analytics ✓ (SQL pendente) |
| `configuracoes/page.tsx` | **NÃO CRIADO** |

## Páginas fora do dashboard
- `src/app/pesquisa/[slug]/page.tsx` — formulário público sem auth ✓
- `src/app/api/upload/foto-lider/route.ts` — upload fotos líderes ✓
- `src/app/api/upload/foto-candidato/route.ts` — upload foto/logo candidato ✓
- `src/app/api/pesquisa/responder/route.ts` — salvar respostas ✓

## Componentes
- `src/components/mapa/MapaComponent.tsx` — pinos com foto circular, popup, camadas toggle

## O QUE FALTA FAZER (em ordem de prioridade)

### 1. Rodar SQL das pesquisas no Supabase (usuário faz isso)

### 2. Atualizar dashboard/page.tsx — adicionar ao array `modulos`:
```ts
{ titulo:'Pesquisas & Enquetes', desc:'Crie pesquisas e analise resultados por região', icone:'📊', href:'/dashboard/pesquisas', ativo:true },
{ titulo:'Configurações', desc:'Logomarca, cor do partido e preferências', icone:'⚙️', href:'/dashboard/configuracoes', ativo:true },
```

### 3. Criar src/app/dashboard/configuracoes/page.tsx
- Carregar/salvar tabela `configuracoes` (criar: `CREATE TABLE IF NOT EXISTS configuracoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cor_primaria text DEFAULT '#C9A84C', atualizado_em timestamptz DEFAULT now())`)
- Color picker com presets de partidos: PT `#E11D48`, PL `#1D4ED8`, MDB `#16A34A`, PDT `#EA580C`, União `#0284C7`, padrão `#C9A84C`
- Aplicar via `document.documentElement.style.setProperty('--clr-primary', cor)` + localStorage
- **ATENÇÃO:** as inline styles hardcoded com `#C9A84C` NÃO serão afetadas pelo CSS var. Para tematização real precisaria refatorar todos os arquivos trocando `'#C9A84C'` por `'var(--clr-primary, #C9A84C)'` — decisão pendente

### 4. Funcionalidades futuras discutidas mas não iniciadas
- Integração Z-API (WhatsApp)
- Integração Asaas (pagamento)
- Módulo Apuração TSE (cruzamento votos)
- Página Materiais (biblioteca de artes)

## Padrão de upload de imagem (para referência)
```ts
// API route — sempre criar supabaseAdmin DENTRO do handler
const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
// Verificar/criar bucket, fazer upload com upsert:true, retornar URL com cache-bust ?t=Date.now()
// Atualizar coluna na tabela após upload
```
