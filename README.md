# Revista OJ — Oficina das Joias

Site estático em formato de revista digital (rolagem contínua, sem flipbook) para a
**Oficina das Joias**, com o conteúdo da *Revista OJ Vol. 2 — Tessalia* e uma versão
digital, jogável, do cartão de mosaico para colorir que acompanha a edição impressa.

Construído com [Astro](https://astro.build) — HTML estático, sem painel
administrativo, pronto para deploy em qualquer host estático (Vercel recomendado).

## Estrutura do projeto

```
src/
  components/     uma seção da revista por componente (Hero, HistorySection, ...)
  layouts/        BaseLayout.astro — <head>, fontes, SEO
  scripts/        coloring-game.ts — lógica do jogo (canvas + flood fill)
  styles/         tokens.css (cores/tipografia extraídas da revista) + global.css
  assets/photos/  fotos já otimizadas (geradas por scripts/process-images.mjs)
  assets/game/    logo OJ otimizado
public/
  game/mosaic-lineart.png   arte do mosaico para colorir (preto/branco puro,
                             servida sem reprocessamento — ver nota abaixo)
scripts/
  process-images.mjs        regenera src/assets/ a partir de source-material/
source-material/  (fora do git — ver abaixo)
  revista oj vol 2 digital.pdf
  card frente mosaico.pdf
  extraction/                texto e imagens já extraídos dos PDFs
```

### Por que `source-material/` não está no Git

Os PDFs originais (a revista tem ~170MB) excedem o limite de 100MB por arquivo do
GitHub e não são necessários para rodar ou publicar o site — só para regenerar as
imagens. Guarde os PDFs originais localmente ou em um Drive compartilhado com a
cliente; o `.gitignore` já exclui essa pasta.

Se precisar reprocessar as imagens (nova edição, fotos trocadas, etc.):

1. Coloque os PDFs em `source-material/` com os mesmos nomes de arquivo.
2. Rode a extração (Python + PyMuPDF — tira texto e todas as fotos do PDF):
   ```
   pip install pymupdf
   python scripts/extract-pdf.py
   ```
   Isso gera `source-material/extraction/` com o texto de cada página
   (`text/pages_raw.json`) e todas as imagens embutidas no PDF.
3. Escolha à mão, em `scripts/process-images.mjs`, quais das imagens extraídas
   entram no site (arrays `PHOTOS`/`STRIPS`) — a extração traz *todas* as fotos do
   PDF, geralmente mais do que cabe numa página de rolagem contínua.
4. Rode `npm run process-images` — isso regenera `src/assets/photos/`,
   `src/assets/game/`, `public/game/mosaic-lineart.png`, favicons e a imagem de
   compartilhamento (`public/og-cover.jpg`).

O mosaico do jogo (`public/game/mosaic-lineart.png`) é gerado com um *threshold*
(preto/branco puro) para o preenchimento por clique (flood fill) funcionar sem
"vazar" por bordas borradas de JPEG — por isso ele fica em `public/` em vez de
`src/assets`, servido sem passar pelo pipeline de otimização de imagem do Astro
(que poderia reintroduzir compressão com perdas).

## Desenvolvimento

```
npm install
npm run dev       # http://localhost:4321
npm run build     # gera dist/
npm run preview   # serve dist/ localmente
```

## Design

Cores e tipografia **não são uma reinterpretação livre** — foram extraídas
diretamente do PDF da revista (fontes lidas dos metadados do PDF, cores amostradas
dos pixels reais das artes). Ver `src/styles/tokens.css` para a lista completa e o
raciocínio de cada token.

- **Bodoni Moda** (títulos/serifado) e **Poppins** (corpo/sans) — mesmas fontes da
  revista, hospedadas localmente via `@fontsource` (sem carregar de CDN externo).
- A revista usa uma terceira fonte, **Seenonim**, só na palavra "TESSALIA" — não é
  uma fonte web licenciada disponível, então o site usa Poppins ExtraBold com
  tracking largo como substituta (`--font-wordmark` em `tokens.css`). Se a cliente
  tiver a licença dessa fonte, é só trocar esse token.

## O jogo de colorir

`src/scripts/coloring-game.ts` implementa um flood fill (preenchimento por
varredura de linhas) em canvas puro, sem bibliotecas. Roda inteiramente no
navegador: nenhum dado é enviado para qualquer servidor. O progresso de cada
visitante fica salvo só no `localStorage` do próprio navegador (não é compartilhado
entre dispositivos nem visível para a Oficina das Joias).

## Segurança

- **CSP estrita** (`astro.config.mjs` → `security.csp`): o Astro calcula
  automaticamente o hash dos scripts/estilos que ele mesmo empacota a cada build,
  então a política fica sempre correta sem manutenção manual — não é necessário
  `'unsafe-inline'`.
- Cabeçalhos adicionais (`X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS) ficam em `vercel.json`, já que um `<meta>` de CSP não
  consegue expressá-los.
- Sem formulário de contato com backend: os links de contato usam `tel:`,
  `wa.me` (WhatsApp) e `mailto:`/Instagram diretos — não há superfície de ataque de
  servidor porque não há servidor.
- Fontes self-hosted (sem chamada a fonts.googleapis.com).

## Deploy (Vercel)

1. Suba este repositório para o GitHub (sem a pasta `source-material/`, que já é
   ignorada).
2. Em [vercel.com](https://vercel.com), "Add New Project" → importe o repositório.
   O framework Astro é detectado automaticamente; não é preciso configurar nada.
3. Depois do primeiro deploy, em **Settings → Domains**, adicione o domínio
   `.com.br` da marca (registrado à parte em [registro.br](https://registro.br)) e
   siga as instruções de DNS que a Vercel mostrar (em geral um registro `A` ou
   `CNAME` apontando para a Vercel).
4. Atualize `site:` em `astro.config.mjs` e `Sitemap:` em `public/robots.txt` para
   o domínio final — isso ajusta as URLs do sitemap e das tags Open Graph.

Qualquer novo `git push` para o branch principal publica uma nova versão
automaticamente — não há painel administrativo porque não há necessidade: o
conteúdo é editado direto nos componentes em `src/components/`.
