// Canvas flood-fill coloring game for the digital version of the magazine's
// mosaic coloring card. Vanilla TS, no dependencies: the whole interaction
// is same-origin canvas + localStorage, so it needs nothing from the
// network at runtime and nothing here can reach off-page.

const STORAGE_KEY = "oj-mosaic-coloring-v1";
const BOUNDARY_LUMA_MAX = 60; // pixels darker than this are treated as ink lines, never filled
const HISTORY_LIMIT = 12;

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseCssColor(cssColor: string): RGBA {
  // getComputedStyle always resolves to "rgb(r, g, b)" / "rgba(r, g, b, a)"
  const m = cssColor.match(/rgba?\(([^)]+)\)/);
  if (!m) return { r: 0, g: 0, b: 0, a: 255 };
  const parts = m[1].split(",").map((n) => parseFloat(n.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: Math.round((parts[3] ?? 1) * 255) };
}

function floodFill(imageData: ImageData, startX: number, startY: number, fill: RGBA) {
  const { width, height, data } = imageData;
  const idx = (x: number, y: number) => (y * width + x) * 4;

  const startI = idx(startX, startY);
  const targetR = data[startI];
  const targetG = data[startI + 1];
  const targetB = data[startI + 2];

  const targetLuma = 0.299 * targetR + 0.587 * targetG + 0.114 * targetB;
  if (targetLuma < BOUNDARY_LUMA_MAX) return false; // clicked on a line, ignore

  if (targetR === fill.r && targetG === fill.g && targetB === fill.b) return false; // no-op

  const matches = (i: number) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (0.299 * r + 0.587 * g + 0.114 * b < BOUNDARY_LUMA_MAX) return false;
    return r === targetR && g === targetG && b === targetB;
  };

  // scanline flood fill — far cheaper than a naive 4-way stack fill on a
  // ~1.4M pixel canvas
  const stack: Array<[number, number]> = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    let xLeft = x;
    let i = idx(xLeft, y);
    while (xLeft >= 0 && matches(i)) {
      xLeft--;
      i = idx(xLeft, y);
    }
    xLeft++;

    let xRight = x;
    i = idx(xRight, y);
    while (xRight < width && matches(i)) {
      xRight++;
      i = idx(xRight, y);
    }
    xRight--;

    let spanAbove = false;
    let spanBelow = false;
    for (let xi = xLeft; xi <= xRight; xi++) {
      const here = idx(xi, y);
      data[here] = fill.r;
      data[here + 1] = fill.g;
      data[here + 2] = fill.b;
      data[here + 3] = 255;

      if (y > 0) {
        const above = matches(idx(xi, y - 1));
        if (!spanAbove && above) {
          stack.push([xi, y - 1]);
          spanAbove = true;
        } else if (spanAbove && !above) {
          spanAbove = false;
        }
      }
      if (y < height - 1) {
        const below = matches(idx(xi, y + 1));
        if (!spanBelow && below) {
          stack.push([xi, y + 1]);
          spanBelow = true;
        } else if (spanBelow && !below) {
          spanBelow = false;
        }
      }
    }
  }
  return true;
}

export function initColoringGame(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]");
  const swatchButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-swatch]"));
  const customColorInput = root.querySelector<HTMLInputElement>("[data-custom-color]");
  const undoBtn = root.querySelector<HTMLButtonElement>("[data-undo]");
  const resetBtn = root.querySelector<HTMLButtonElement>("[data-reset]");
  const downloadBtn = root.querySelector<HTMLButtonElement>("[data-download]");
  const lineArtSrc = root.dataset.lineart;
  const status = root.querySelector<HTMLElement>("[data-status]");

  if (!canvas || !lineArtSrc) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  let activeColor: RGBA = { r: 59, g: 116, b: 176, a: 255 };
  let previousFrame: string | null = null;
  let ready = false;

  function setStatus(msg: string) {
    if (status) status.textContent = msg;
  }

  function setActiveSwatch(btn: HTMLButtonElement | null) {
    for (const b of swatchButtons) b.setAttribute("aria-pressed", String(b === btn));
  }

  function saveToStorage() {
    try {
      const canvasEl = canvas as HTMLCanvasElement;
      localStorage.setItem(STORAGE_KEY, canvasEl.toDataURL("image/png"));
    } catch {
      // storage full / blocked (private mode) — coloring still works this
      // session, it just won't persist across reloads
    }
  }

  function loadImageOnto(src: string, onDone?: () => void) {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      ready = true;
      onDone?.();
    };
    img.onerror = () => setStatus("Não foi possível carregar o desenho do mosaico.");
    img.src = src;
  }

  function pushHistory() {
    try {
      previousFrame = (canvas as HTMLCanvasElement).toDataURL("image/png");
    } catch {
      previousFrame = null;
    }
  }

  function pointerToCanvasXY(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY),
    };
  }

  canvas.addEventListener("click", (e) => {
    if (!ready) return;
    const { x, y } = pointerToCanvasXY(e.clientX, e.clientY);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

    pushHistory();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const filled = floodFill(imageData, x, y, activeColor);
    if (filled) {
      ctx.putImageData(imageData, 0, 0);
      saveToStorage();
      setStatus("Área pintada. Escolha outra cor para continuar.");
    }
  });

  for (const btn of swatchButtons) {
    btn.addEventListener("click", () => {
      activeColor = parseCssColor(getComputedStyle(btn).backgroundColor);
      setActiveSwatch(btn);
      if (customColorInput) customColorInput.value = rgbToHex(activeColor);
      setStatus(`Cor selecionada: ${btn.dataset.name ?? ""}. Toque em uma área do mosaico.`);
    });
  }

  if (customColorInput) {
    customColorInput.addEventListener("input", () => {
      const hex = customColorInput.value;
      activeColor = hexToRgb(hex);
      setActiveSwatch(null);
      setStatus("Cor personalizada selecionada. Toque em uma área do mosaico.");
    });
  }

  undoBtn?.addEventListener("click", () => {
    if (!previousFrame) return;
    loadImageOnto(previousFrame, () => {
      saveToStorage();
      setStatus("Última pintura desfeita.");
    });
    previousFrame = null;
  });

  resetBtn?.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    previousFrame = null;
    loadImageOnto(lineArtSrc, () => setStatus("Mosaico reiniciado."));
  });

  downloadBtn?.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "mosaico-oficina-das-joias.png";
    link.href = (canvas as HTMLCanvasElement).toDataURL("image/png");
    link.click();
  });

  // restore a previous session's coloring, if any and if it still parses
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  loadImageOnto(saved || lineArtSrc, () => {
    setStatus(saved ? "Sua pintura anterior foi restaurada." : "Escolha uma cor e toque no mosaico para pintar.");
  });

  if (swatchButtons[0]) {
    activeColor = parseCssColor(getComputedStyle(swatchButtons[0]).backgroundColor);
    setActiveSwatch(swatchButtons[0]);
  }
}

function hexToRgb(hex: string): RGBA {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255, a: 255 };
}

function rgbToHex({ r, g, b }: RGBA) {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}
