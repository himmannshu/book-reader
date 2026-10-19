// Keeps drag-selection inside PDF.js text layers from jumping. Ported from PDF.js's own viewer
// (web/text_layer_builder.js, Apache-2.0, Copyright Mozilla Foundation), trimmed to what we need.
//
// A text layer is absolutely positioned spans with gaps between them. When the pointer is over a gap,
// browsers extend the selection to whatever comes next in the DOM, often the end of the page. Each
// layer ends with an `endOfContent` block. While selecting, the `selecting` class stretches it over
// the layer (see text-layer.css), so gaps hit it instead. In browsers that still jump (Safari,
// older Chromium), it is also moved next to the selection's moving end.

const layers = new Map<HTMLElement, HTMLElement>();
let listening: AbortController | null = null;

function reset(end: HTMLElement, layer: HTMLElement): void {
  layer.append(end);
  end.style.width = '';
  end.style.height = '';
  end.style.userSelect = '';
  layer.classList.remove('selecting');
}

let needsEndMoving: boolean | undefined;

function browserNeedsEndMoving(layer: HTMLElement): boolean {
  if (needsEndMoving !== undefined) return needsEndMoving;
  // Firefox and Chromium 148+ select across gaps correctly on their own.
  const firefox = getComputedStyle(layer).getPropertyValue('-moz-user-select') === 'none';
  const chromium = /\bChrome\/(\d+)\b/.exec(navigator.userAgent)?.[1];
  needsEndMoving = !firefox && !(chromium !== undefined && parseInt(chromium, 10) >= 148);
  return needsEndMoving;
}

function listen(): void {
  if (listening) return;
  listening = new AbortController();
  const { signal } = listening;
  let pointerDown = false;
  let previous: Range | undefined;

  document.addEventListener('pointerdown', () => (pointerDown = true), { signal });
  document.addEventListener(
    'pointerup',
    () => {
      pointerDown = false;
      layers.forEach(reset);
    },
    { signal },
  );
  window.addEventListener(
    'blur',
    () => {
      pointerDown = false;
      layers.forEach(reset);
    },
    { signal },
  );
  document.addEventListener(
    'keyup',
    () => {
      if (!pointerDown) layers.forEach(reset);
    },
    { signal },
  );
  document.addEventListener(
    'selectionchange',
    () => {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        layers.forEach(reset);
        return;
      }
      const range = selection.getRangeAt(0);
      for (const [layer, end] of layers) {
        if (range.intersectsNode(layer)) layer.classList.add('selecting');
        else reset(end, layer);
      }
      const first = layers.keys().next().value;
      if (!first || !browserNeedsEndMoving(first)) return;

      const movingStart =
        previous !== undefined &&
        (range.compareBoundaryPoints(Range.END_TO_END, previous) === 0 ||
          range.compareBoundaryPoints(Range.START_TO_END, previous) === 0);
      let anchor: Node | null = movingStart ? range.startContainer : range.endContainer;
      if (anchor.nodeType === Node.TEXT_NODE) anchor = anchor.parentNode;
      if (!movingStart && range.endOffset === 0) {
        do {
          while (anchor && !anchor.previousSibling) anchor = anchor.parentNode;
          anchor = anchor?.previousSibling ?? null;
        } while (anchor && !anchor.childNodes.length);
      }
      const parent = anchor?.parentElement;
      const layer = parent?.closest<HTMLElement>('.textLayer');
      const end = layer ? layers.get(layer) : undefined;
      if (parent && layer && end && anchor) {
        end.style.width = layer.style.width;
        end.style.height = layer.style.height;
        end.style.userSelect = 'text';
        parent.insertBefore(end, movingStart ? anchor : anchor.nextSibling);
      }
      previous = range.cloneRange();
    },
    { signal },
  );
}

/** Adds the end-of-content block to a rendered text layer and tracks it. */
export function trackTextLayer(layer: HTMLElement): void {
  const end = document.createElement('div');
  end.className = 'endOfContent';
  layer.append(end);
  layer.addEventListener('mousedown', () => layer.classList.add('selecting'));
  layers.set(layer, end);
  listen();
}

/** Stops tracking a text layer that is being removed. */
export function untrackTextLayer(layer: HTMLElement): void {
  if (!layers.delete(layer)) return;
  if (layers.size === 0) {
    listening?.abort();
    listening = null;
  }
}
