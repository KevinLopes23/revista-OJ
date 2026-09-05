// Regenerates the web-ready image assets used by the site from the raw
// magazine material in source-material/. Source PDFs and full extraction
// are gitignored (too large for GitHub); this script is what turns that
// raw material into the optimized files actually committed under
// src/assets/. Run with: node scripts/process-images.mjs
//
// If source-material/ isn't present (e.g. a fresh clone), the script skips
// cleanly — the already-committed src/assets/ files are the ones that ship.
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcImages = join(root, "source-material", "extraction", "images");
const srcGame = join(root, "source-material", "extraction", "game");
const srcSupplied = join(root, "source-material", "supplied");
const outPhotos = join(root, "src", "assets", "photos");
const outBrand = join(root, "src", "assets", "brand");
const publicDir = join(root, "public");
// --p-cream, the page/header background the brand art is composited onto
const CREAM = "#fcf5e1";
// served byte-for-byte, unprocessed by Astro's image pipeline: the coloring
// game's flood-fill needs the exact thresholded pure black/white pixels,
// not a re-encoded (even losslessly) copy.
const outGamePublic = join(root, "public", "game");

if (!existsSync(srcImages)) {
  console.log("source-material/ not found — skipping regeneration, keeping committed assets as-is.");
  process.exit(0);
}

for (const dir of [outPhotos, outGamePublic, outBrand]) {
  mkdirSync(dir, { recursive: true });
}

// [source filename, output filename, max long-edge px]
// Curated by hand from the 93 images extracted from the magazine PDF —
// picking the strongest photo per beat of the story instead of shipping
// every raster on every page.
const PHOTOS = [
  ["p01_img0_2641x3728.jpeg", "cover-hero.jpg", 2600],
  // p05_img1 is a decorative gradient triangle from the page layout, not a
  // photo — the Bizmoune shells are the wide specimen strip in p05_img0
  ["p05_img0_3600x1039.jpeg", "history-shells.jpg", 1800],
  ["p05_img6_3187x3162.jpeg", "history-necklace-egypt.jpg", 1800],
  ["p05_img4_1701x1688.jpeg", "history-egypt-painting.jpg", 1600],
  ["p06_img0_3281x3399.jpeg", "history-victorian.jpg", 1800],
  ["p05_img8_2851x2822.jpeg", "history-necklace-leaves.jpg", 1600],
  ["p06_img1_2625x1797.jpeg", "history-jewelry-box.jpg", 1600],
  ["p06_img3_2153x3038.jpeg", "history-model-chain.jpg", 1400],
  ["p08_img3_2895x3843.jpeg", "tessalia-portrait.jpg", 2000],
  ["p08_img2_1358x1802.jpeg", "tessalia-pearls.jpg", 1400],
  ["p08_img4_5306x3394.jpeg", "guell-barcelona.jpg", 2200],
  ["p10_img1_3408x5184.jpeg", "ensaio-fence.jpg", 2000],
  ["p10_img3_1365x1642.jpeg", "ensaio-picnic.jpg", 1400],
  ["p11_img3_2309x2228.jpeg", "produto-brincos-azul.jpg", 1600],
  ["p11_img4_1891x1822.jpeg", "produto-aneis-rosa.jpg", 1600],
  ["p12_img3_1365x1090.jpeg", "produto-pingente-madreperola.jpg", 1400],
  ["p12_img9_1342x2733.jpeg", "produto-colar-rubi.jpg", 1400],
  ["p13_img0_470x662.jpeg", "trencadis-pingente-1.jpg", 900],
  ["p13_img1_521x735.jpeg", "trencadis-pingente-2.jpg", 900],
  ["p14_img0_2208x1847.jpeg", "relogio-antigo.jpg", 1600],
  ["p14_img1_621x680.jpeg", "relojoaria-retrato-antigo.jpg", 900],
  ["p14_img2_399x440.jpeg", "relogio-mostrador.jpg", 900],
  ["p14_img3_4128x4027.jpeg", "relojoaria-maos.jpg", 1800],
  ["p15_img0_4128x1822.jpeg", "joalheria-solda.jpg", 1800],
  ["p15_img1_4128x3342.jpeg", "joalheria-bancada.jpg", 1800],
  ["p15_img2_3414x5793.jpeg", "joalheria-elias.jpg", 1600],
  ["p15_img3_3542x5005.jpeg", "joalheria-fusao.jpg", 2000],
  ["p17_img0_1365x1292.jpeg", "elaine-retrato.jpg", 1400],
  ["p17_img1_967x1081.jpeg", "elaine-revista.jpg", 1200],
  ["p18_img2_1296x1830.jpeg", "contato-retrato.jpg", 1600],

  // ensaio fotográfico — fotos de lifestyle adicionais, curadas a partir das
  // 95 imagens extraídas (ver source-material/README ausente / conversa de
  // curadoria): completam a galeria da CollectionSection.
  ["p02_img0_4202x2967.jpeg", "ensaio-piquenique-leitura.jpg", 2200],
  ["p03_img0_2766x3903.jpeg", "ensaio-piquenique-frutas.jpg", 1800],
  ["p08_img0_1062x1409.jpeg", "ensaio-flores.jpg", 1600],
  ["p09_img7_2360x3331.jpeg", "ensaio-piquenique-grama.jpg", 1800],
  ["p10_img0_1365x1376.jpeg", "ensaio-cereja.jpg", 1400],
  ["p10_img2_1827x1365.jpeg", "ensaio-piscina.jpg", 1600],
  ["p11_img0_1295x1830.jpeg", "ensaio-limao.jpg", 1600],
  ["p11_img1_1365x2016.jpeg", "ensaio-viseira.jpg", 1600],
  ["p11_img2_1101x1622.jpeg", "ensaio-oculos-sorriso.jpg", 1400],
  ["p12_img0_2048x1365.jpeg", "ensaio-regata-branca.jpg", 1600],
  ["p12_img1_1361x2048.jpeg", "ensaio-tenis.jpg", 1600],
  ["p12_img2_979x1556.jpeg", "ensaio-vestido-vento.jpg", 1400],
  ["p12_img5_2036x1365.jpeg", "ensaio-perfil-brinco.jpg", 1600],

  // still de produto sobre fundo colorido — bloco "mosaico" da CollectionSection
  ["p07_img0_4283x3025.jpeg", "produto-aliancas.jpg", 1600],
  ["p08_img1_1081x1432.jpeg", "produto-colar-macro.jpg", 1400],
  ["p09_img6_2561x1891.jpeg", "produto-pingente-coracao.jpg", 1400],
  ["p10_img4_2364x2423.jpeg", "produto-brincos-perola.jpg", 1400],
  ["p10_img5_4128x3860.jpeg", "produto-colar-perolas.jpg", 1400],
  ["p10_img6_1229x1238.jpeg", "produto-pulseira-couro.jpg", 1200],
  ["p11_img5_2308x2225.jpeg", "produto-conjunto-azul.jpg", 1400],
  ["p11_img6_1514x1459.jpeg", "produto-aneis-cristal.jpg", 1400],
  ["p11_img7_1235x1893.jpeg", "produto-brincos-gota.jpg", 1400],
  ["p12_img4_906x688.jpeg", "produto-anel-detalhe.jpg", 1200],
  ["p12_img6_1975x2008.jpeg", "produto-brincos-mint.jpg", 1400],
  ["p12_img7_2303x1474.jpeg", "produto-colares-coloridos.jpg", 1400],
  ["p12_img8_2673x2319.jpeg", "produto-brincos-drusa.jpg", 1400],
  ["p19_img0_1233x1740.jpeg", "produto-pulseiras-conjunto.jpg", 1400],

  // outras seções
  ["p05_img2_716x708.jpeg", "history-mosaico-bizantino.jpg", 1200],
  ["p04_img4_971x688.jpeg", "craft-fachada.jpg", 1800],
  ["p16_img0_1405x993.jpeg", "elaine-mesa.jpg", 1600],
  ["p04_img5_1518x1074.jpeg", "equipe-familia.jpg", 1800],
];

// photos that did not come out of the PDF — supplied separately and kept in
// source-material/supplied/ alongside the extraction, same as everything else
// here: gitignored at source, shipped as the optimized file under src/assets.
const SUPPLIED = [["relojoaria-bancada.jpg", "craft-relojoaria.jpg", 1800]];

// decorative trencadís header/footer strips — reused verbatim from the
// magazine's own layout as section dividers, one colorway per chapter.
const STRIPS = [
  ["p03_img1_1867x236.png", "strip-blue.png", 1867],
  ["p03_img3_1867x232.jpeg", "strip-pink.jpg", 1867],
  ["p18_img4_935x232.jpeg", "strip-green.jpg", 935],
];

async function convert(srcDir, [srcName, outName, maxSize], outDir) {
  const srcPath = join(srcDir, srcName);
  if (!existsSync(srcPath)) {
    console.warn("MISSING source file, skipped:", srcName);
    return;
  }
  const outPath = join(outDir, outName);
  const img = sharp(srcPath).rotate();
  const meta = await img.metadata();
  const isPng = outName.endsWith(".png");
  // width-only constraint: sharp derives height from it to preserve aspect
  // ratio. Passing an equal height alongside `fit:"inside"` (the previous
  // code) makes the SHORTER side the limiting one, which silently caps
  // portrait (taller-than-wide) photos far below `maxSize` — e.g. a
  // 2641x3728 photo asked for "2600" would come out ~1842px wide, not 2600.
  let pipeline = img.resize({
    width: maxSize,
    withoutEnlargement: true,
  });
  pipeline = isPng
    ? pipeline.png({ quality: 90, compressionLevel: 9 })
    : pipeline.jpeg({ quality: 84, mozjpeg: true });
  await pipeline.toFile(outPath);
  console.log("wrote", outName, `(from ${meta.width}x${meta.height})`);
}

for (const entry of PHOTOS) await convert(srcImages, entry, outPhotos);
for (const entry of STRIPS) await convert(srcImages, entry, outPhotos);
for (const entry of SUPPLIED) await convert(srcSupplied, entry, outPhotos);

// coloring game line art
if (existsSync(srcGame)) {
  // The card PDF's line art is a JPEG scan (soft/anti-aliased edges), which
  // is unusable for canvas flood-fill: a fill would leak through fuzzy
  // grays at the line boundary. Threshold it to pure black/white so every
  // pixel is unambiguously "line" or "fillable region".
  await sharp(join(srcGame, "card_img0_1182x1182.jpeg"))
    .greyscale()
    .normalise()
    .threshold(155)
    .png({ compressionLevel: 9 })
    .toFile(join(outGamePublic, "mosaic-lineart.png"));
  console.log("wrote public/game/mosaic-lineart.png (thresholded for flood-fill)");
}

// Tessalia brand mark for the header, and the favicons cut from the same
// art. The supplied file is the full lockup on a page of white — the ring
// at rows 436-990, the TESSALIA wordmark below it — and at the sizes these
// are used the wordmark is a smudge, so only the ring is kept. Its paper is
// then swapped for the site's cream: threshold the near-white to an alpha
// mask, cut it out, and flatten onto --p-cream, so the mark meets the
// sticky bar's background instead of sitting on a white tile. The grout
// between the tesserae goes cream along with it, which is what the print
// edition does when it prints the mark on a cream page.
const brandSrc = join(srcSupplied, "tessalia-logo.jpg");
if (existsSync(brandSrc)) {
  const RING = { left: 212, top: 436, width: 478, height: 555 };
  const ring = sharp(brandSrc).extract(RING);
  const paperMask = await ring.clone().greyscale().threshold(248).negate().toBuffer();
  const cut = await ring.clone().joinChannel(paperMask).png().toBuffer();
  const onCream = () => sharp(cut).flatten({ background: CREAM });

  await onCream()
    .resize({ width: 400 })
    .png({ compressionLevel: 9, palette: true })
    .toFile(join(outBrand, "tessalia-mark.png"));
  console.log("wrote src/assets/brand/tessalia-mark.png (ring only, paper swapped for cream)");

  // favicons, straight into public/ (Astro serves that folder verbatim,
  // unprocessed, which is what a favicon needs). The ring is taller than
  // wide, so it is fitted inside the square on cream — sharp's default
  // `cover` would crop to fill and take the diamond off the top.
  //
  // The 32px tab icon is saturated first. The ring is drawn in strokes a
  // couple of source pixels wide; at 32px each one averages with the cream
  // around it and the whole mark comes out pale enough to read as grey in
  // a tab strip. Pushing the colour before the downscale gives the average
  // something to land on. 180px keeps the art as drawn — at that size the
  // strokes survive on their own.
  const ICONS = [
    [32, 1.8],
    [180, 1],
  ];
  for (const [size, saturation] of ICONS) {
    await sharp(cut)
      .modulate({ saturation })
      .flatten({ background: CREAM })
      .resize({ width: size, height: size, fit: "contain", background: CREAM })
      .png()
      .toFile(join(publicDir, `favicon-${size}.png`));
    console.log(`wrote public/favicon-${size}.png`);
  }
}

// social share image, generated straight into public/ alongside the icons
const coverSrc = join(srcImages, "p01_img0_2641x3728.jpeg");
if (existsSync(coverSrc)) {
  await sharp(coverSrc)
    .resize({ width: 1200, height: 630, fit: "cover", position: "top" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(publicDir, "og-cover.jpg"));
}

console.log("Done.");
