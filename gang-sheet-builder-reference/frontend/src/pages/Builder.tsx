import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useDropzone } from 'react-dropzone';
import { Rnd } from 'react-rnd';
import {
  Upload, Trash2, Plus, Save, X, Copy,
  AlignLeft, AlignCenter, AlignRight, AlignCenterHorizontal, AlignCenterVertical,
  RotateCw, RotateCcw,
  ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
  Undo2, Redo2, ShoppingCart, User, Type, ImageIcon,
  Lock, Unlock, ZoomIn, ZoomOut, FlipHorizontal2, Crop,
  Settings, Zap, Bold, ChevronDown, Pencil, Check,
  FolderOpen, LogIn, Loader2, Trash, BookImage, ClipboardList, ExternalLink,
  FlipVertical2, Download, FileImage, Sparkles
} from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { FunkyFreshLogo } from '@/components/FunkyFreshLogo';
import { getProductByHandle } from '@/lib/shopify';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '').replace(/^\//, '');
function apiUrl(path: string): string {
  const base = API_BASE ? `/${API_BASE}` : '';
  return `${base}/api${path}`;
}

let _gangSheetVariantId: string | null | undefined = undefined;
async function fetchGangSheetVariantId(): Promise<string | undefined> {
  if (_gangSheetVariantId !== undefined) return _gangSheetVariantId ?? undefined;
  try {
    const product = await getProductByHandle('created-gang-sheet');
    _gangSheetVariantId = product.variants.edges[0]?.node.id ?? null;
  } catch {
    _gangSheetVariantId = null;
  }
  return _gangSheetVariantId ?? undefined;
}

// ── Collision helpers ────────────────────────────────────────────────────────
function aabbOverlap(ax: number, ay: number, aw: number, ah: number,
                     bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

type CollisionResult = { x: number; y: number; collidingIds: Set<string> };

function resolveCollision(
  dragging: { width: number; height: number },
  proposedX: number, proposedY: number,
  prevX: number, prevY: number,
  others: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  // Each obstacle is expanded by this many pixels on every side so the dragging
  // item stops MIN_GAP_PX before touching another image rather than at contact.
  buffer = MIN_GAP_PX,
): CollisionResult {
  const { width: w, height: h } = dragging;
  const collidingIds = new Set<string>();
  let dx = proposedX - prevX;
  let dy = proposedY - prevY;
  if (dx === 0 && dy === 0) return { x: prevX, y: prevY, collidingIds };

  let curX = prevX;
  let curY = prevY;
  const MAX_ITER = 4;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    if (dx === 0 && dy === 0) break;

    let earliestT = 1.0;
    let hitAxis: 'x' | 'y' | null = null;
    let hitId: string | null = null;

    for (const o of others) {
      // Expand obstacle by `buffer` on all sides so the dragging item halts
      // MIN_GAP_PX pixels away from the actual obstacle edge.
      const ox = o.x - buffer, ow = o.width  + 2 * buffer;
      const oy = o.y - buffer, oh = o.height + 2 * buffer;

      let tEnterX = -Infinity, tLeaveX = Infinity;
      let tEnterY = -Infinity, tLeaveY = Infinity;

      if (dx !== 0) {
        const invDx = 1 / dx;
        const t1 = (ox - (curX + w)) * invDx;
        const t2 = ((ox + ow) - curX) * invDx;
        tEnterX = Math.min(t1, t2);
        tLeaveX = Math.max(t1, t2);
      } else {
        if (curX >= ox + ow || curX + w <= ox) continue;
      }

      if (dy !== 0) {
        const invDy = 1 / dy;
        const t1 = (oy - (curY + h)) * invDy;
        const t2 = ((oy + oh) - curY) * invDy;
        tEnterY = Math.min(t1, t2);
        tLeaveY = Math.max(t1, t2);
      } else {
        if (curY >= oy + oh || curY + h <= oy) continue;
      }

      const tEnter = Math.max(tEnterX, tEnterY);
      const tLeave = Math.min(tLeaveX, tLeaveY);

      if (tEnter >= tLeave) continue;
      if (tEnter < -1e-9 || tEnter > 1.0) continue;

      const tContact = Math.max(0, tEnter);
      if (tContact < earliestT) {
        earliestT = tContact;
        hitAxis = tEnterX > tEnterY ? 'x' : 'y';
        hitId = o.id;
      }
    }

    if (hitId === null) {
      curX += dx;
      curY += dy;
      break;
    }

    collidingIds.add(hitId);

    const safeT = Math.max(0, earliestT - 1e-4);
    curX += dx * safeT;
    curY += dy * safeT;

    const remainT = 1.0 - earliestT;
    if (hitAxis === 'x') {
      dx = 0;
      dy = dy * remainT;
    } else {
      dy = 0;
      dx = dx * remainT;
    }
  }

  // Final pass: highlight ALL walls within stopping distance of the resolved
  // position. EPS covers the buffer zone so items blocked at gap distance
  // still light up as colliding.
  const EPS = buffer + 2;
  for (const o of others) {
    if (curX + w + EPS > o.x && curX < o.x + o.width + EPS &&
        curY + h + EPS > o.y && curY < o.y + o.height + EPS) {
      collidingIds.add(o.id);
    }
  }

  return { x: curX, y: curY, collidingIds };
}

type ResizeCollisionResult = { width: number; height: number; x: number; y: number; collidingIds: Set<string> };

function resolveResizeCollision(
  item: { x: number; y: number; width: number; height: number },
  proposedX: number, proposedY: number,
  proposedW: number, proposedH: number,
  others: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  canvasBoundW: number, canvasBoundH: number,
): ResizeCollisionResult {
  const collidingIds = new Set<string>();
  const MIN_DIM = 10;

  let left = proposedX;
  let top = proposedY;
  let right = proposedX + proposedW;
  let bottom = proposedY + proposedH;

  const origLeft = item.x;
  const origTop = item.y;
  const origRight = item.x + item.width;
  const origBottom = item.y + item.height;

  const grewLeft = left < origLeft;
  const grewRight = right > origRight;
  const grewUp = top < origTop;
  const grewDown = bottom > origBottom;

  left = Math.max(0, left);
  top = Math.max(0, top);
  right = Math.min(canvasBoundW, right);
  bottom = Math.min(canvasBoundH, bottom);

  for (const o of others) {
    const oLeft = o.x, oTop = o.y, oRight = o.x + o.width, oBottom = o.y + o.height;

    if (!(left < oRight && right > oLeft && top < oBottom && bottom > oTop)) continue;
    collidingIds.add(o.id);

    if (grewRight && right > oLeft && origRight <= oLeft) {
      right = oLeft;
    }
    if (grewLeft && left < oRight && origLeft >= oRight) {
      left = oRight;
    }
    if (grewDown && bottom > oTop && origBottom <= oTop) {
      bottom = oTop;
    }
    if (grewUp && top < oBottom && origTop >= oBottom) {
      top = oBottom;
    }
  }

  let w = right - left;
  let h = bottom - top;

  if (w < MIN_DIM) {
    if (grewLeft) { left = right - MIN_DIM; } else { w = MIN_DIM; right = left + MIN_DIM; }
    w = MIN_DIM;
  }
  if (h < MIN_DIM) {
    if (grewUp) { top = bottom - MIN_DIM; } else { h = MIN_DIM; bottom = top + MIN_DIM; }
    h = MIN_DIM;
  }

  left = Math.max(0, left);
  top = Math.max(0, top);
  if (left + w > canvasBoundW) left = canvasBoundW - w;
  if (top + h > canvasBoundH) top = canvasBoundH - h;

  return { width: w, height: h, x: left, y: top, collidingIds };
}
// ────────────────────────────────────────────────────────────────────────────

const CANVAS_WIDTH_IN = 22;
const CANVAS_BASE_WIDTH = 520;
const PX_PER_INCH_BASE = CANVAS_BASE_WIDTH / CANVAS_WIDTH_IN;
const MIN_GAP_IN  = 0.05; // minimum gap enforced between images at all times (inches)
const MIN_GAP_PX  = Math.max(1, Math.round(MIN_GAP_IN * PX_PER_INCH_BASE)); // ~1 px at 22" canvas
const PRICE_PER_INCH = 0.26;  // $0.26 per linear inch of height (~$0.0118 per sq inch on 22" width)
const MAX_HEIGHT_IN = 25 * 12; // max sheet height before a new sheet is created (25 feet)
// Maximum tile height for export — keeps canvas within browser limits and jsPDF's 14 400-unit cap
const EXPORT_MAX_TILE_IN = 24;

// ── PNG DPI injection ────────────────────────────────────────────────────────
// canvas.toBlob() produces PNGs with no resolution metadata, so programs that
// default to "1 pixel = 1 mm" would interpret a 6600-pixel-wide file as
// 6600 mm ≈ 22 feet instead of the correct 22 inches.  We fix this by
// injecting a pHYs chunk (pixels per meter) right after the IHDR chunk.
function _pngCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function injectPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const png = new Uint8Array(buf);
  const ppm = Math.round(dpi / 0.0254); // pixels per inch → pixels per metre
  // Build the 21-byte pHYs chunk: [length u32][type 4B][x_ppm u32][y_ppm u32][unit u8][crc u32]
  const chunk = new Uint8Array(21);
  const view  = new DataView(chunk.buffer);
  view.setUint32(0, 9);                                                   // data length = 9
  chunk[4] = 0x70; chunk[5] = 0x48; chunk[6] = 0x59; chunk[7] = 0x73;  // 'pHYs'
  view.setUint32(8, ppm);                                                 // X pixels per metre
  view.setUint32(12, ppm);                                                // Y pixels per metre
  chunk[16] = 1;                                                           // unit = metre
  view.setUint32(17, _pngCrc32(chunk.slice(4, 17)));                     // CRC over type+data
  // Insert pHYs immediately after the IHDR chunk (signature 8B + IHDR 25B = offset 33)
  return new Blob([png.slice(0, 33), chunk, png.slice(33)], { type: 'image/png' });
}
// ────────────────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2, 9);

// ── Draft persistence helpers ─────────────────────────────────────────────────
const DRAFT_LS_KEY = 'radical_prints_draft';
interface DraftPayload {
  library: UploadedImage[];
  sheets: CanvasItem[][];
  sheetNames: string[];
  savedAt: number;
}
function saveDraftToLS(payload: DraftPayload) {
  try { localStorage.setItem(DRAFT_LS_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
}
function loadDraftFromLS(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_LS_KEY);
    return raw ? (JSON.parse(raw) as DraftPayload) : null;
  } catch { return null; }
}
function clearDraftFromLS() {
  try { localStorage.removeItem(DRAFT_LS_KEY); } catch { /* ignore */ }
}

// ── Active project persistence (survives page refresh) ────────────────────────
const ACTIVE_PROJECT_LS_KEY = 'rp_active_project';
interface ActiveProjectRef { id: number; name: string; }
function saveActiveProjectToLS(ref: ActiveProjectRef) {
  try { localStorage.setItem(ACTIVE_PROJECT_LS_KEY, JSON.stringify(ref)); } catch { /* ignore */ }
}
function loadActiveProjectFromLS(): ActiveProjectRef | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_LS_KEY);
    return raw ? (JSON.parse(raw) as ActiveProjectRef) : null;
  } catch { return null; }
}
function clearActiveProjectFromLS() {
  try { localStorage.removeItem(ACTIVE_PROJECT_LS_KEY); } catch { /* ignore */ }
}

type UploadedImage = {
  id: string; url: string; name: string;
  naturalW: number; naturalH: number;
  fileDPI: number;
  docWidthIn?: number; docHeightIn?: number;
  objectPath?: string;
  uploading?: boolean;
};
type CanvasItem = {
  id: string; imageId: string; url: string; name: string;
  x: number; y: number; width: number; height: number;
  naturalW: number; naturalH: number; fileDPI: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
};

// Reads embedded metadata from a PNG: pHYs DPI and Photoshop XMP document dimensions
async function readPngMeta(file: File): Promise<{ dpi: number; docWidthIn?: number; docHeightIn?: number }> {
  const isPng = file.type.includes('png') || file.name.toLowerCase().endsWith('.png');
  if (!isPng) return { dpi: 300 };
  try {
    const buf = await file.arrayBuffer();
    const d = new Uint8Array(buf);
    const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) if (d[i] !== PNG_SIG[i]) return { dpi: 300 };

    let dpi = 300;
    let docWidthIn: number | undefined;
    let docHeightIn: number | undefined;

    // 1. Scan raw bytes for embedded XMP (fast string search before chunk walking)
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(d);
    const xmpStart = raw.indexOf('<x:xmpmeta');
    const xmpEnd = raw.indexOf('</x:xmpmeta>');
    if (xmpStart !== -1 && xmpEnd !== -1) {
      const xmp = raw.slice(xmpStart, xmpEnd + 12);
      // stDim:w / stDim:h as XML elements
      const wEl = xmp.match(/<stDim:w>([\d.]+)<\/stDim:w>/);
      const hEl = xmp.match(/<stDim:h>([\d.]+)<\/stDim:h>/);
      const unitEl = xmp.match(/<stDim:unit>([^<]+)<\/stDim:unit>/);
      // stDim:w / stDim:h as attributes
      const wAttr = xmp.match(/stDim:w="([\d.]+)"/);
      const hAttr = xmp.match(/stDim:h="([\d.]+)"/);
      const unitAttr = xmp.match(/stDim:unit="([^"]+)"/);
      const rawW = wEl?.[1] ?? wAttr?.[1];
      const rawH = hEl?.[1] ?? hAttr?.[1];
      const rawUnit = (unitEl?.[1] ?? unitAttr?.[1] ?? 'Inch').trim().toLowerCase();
      if (rawW && rawH) {
        let w = parseFloat(rawW);
        let h = parseFloat(rawH);
        if (rawUnit === 'point' || rawUnit === 'points') { w /= 72; h /= 72; }
        else if (rawUnit === 'millimeter' || rawUnit === 'millimeters' || rawUnit === 'mm') { w /= 25.4; h /= 25.4; }
        else if (rawUnit === 'centimeter' || rawUnit === 'centimeters' || rawUnit === 'cm') { w /= 2.54; h /= 2.54; }
        if (w > 0 && h > 0) { docWidthIn = w; docHeightIn = h; }
      }
    }

    // 2. Walk PNG chunks for pHYs DPI
    let off = 8;
    while (off + 12 <= d.length) {
      const len = ((d[off] << 24) | (d[off+1] << 16) | (d[off+2] << 8) | d[off+3]) >>> 0;
      const type = String.fromCharCode(d[off+4], d[off+5], d[off+6], d[off+7]);
      if (type === 'pHYs' && len >= 9) {
        const xPPU = ((d[off+8] << 24) | (d[off+9] << 16) | (d[off+10] << 8) | d[off+11]) >>> 0;
        const unit = d[off+16];
        if (unit === 1 && xPPU > 0) dpi = Math.round(xPPU / 39.3701);
        break;
      }
      if (type === 'IDAT') break;
      off += 4 + 4 + len + 4;
    }

    return { dpi, docWidthIn, docHeightIn };
  } catch { /* ignore */ }
  return { dpi: 300 };
}
type LeftPanel = 'images' | 'library' | 'text' | 'projects' | 'orders';

type GangSheetOrder = {
  id: number;
  shopifyOrderId: string | null;
  projectId: number | null;
  canvasWidthIn: number | null;
  canvasHeightIn: number | null;
  sheetCount: number | null;
  imageCount: number | null;
  totalPrice: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

interface LibraryItem {
  id: string;
  libraryId: number | null;
  url: string;
  name: string;
  naturalW: number;
  naturalH: number;
  fileDPI: number;
  docWidthIn?: number;
  docHeightIn?: number;
  objectPath?: string;
  uploading?: boolean;
}

interface SavedProject {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface LibraryPanelProps {
  auth: { isLoggedIn: boolean };
  login: (returnTo?: string) => void;
  libraryImages: LibraryItem[];
  setLibraryImages: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
  isLoadingLibrary: boolean;
  fetchLibrary: () => Promise<void>;
  deleteFromLibrary: (item: LibraryItem) => Promise<void>;
  addToCanvas: (item: LibraryItem) => void;
  apiUrl: (path: string) => string;
  toast: (opts: { title: string; description?: string; variant?: string }) => void;
  onConfirmDeleteLibraryItem?: (item: LibraryItem) => void;
}

function LibraryPanel({
  auth, login, libraryImages, setLibraryImages,
  isLoadingLibrary, fetchLibrary, deleteFromLibrary,
  addToCanvas, apiUrl, toast, onConfirmDeleteLibraryItem,
}: LibraryPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const filteredLibImages = libSearch.trim()
    ? libraryImages.filter(i => i.name.toLowerCase().includes(libSearch.toLowerCase()))
    : libraryImages;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!auth.isLoggedIn) return;
    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        const blobUrl = URL.createObjectURL(file);
        const { dpi: fileDPI, docWidthIn, docHeightIn } = await readPngMeta(file);

        const img = await new Promise<HTMLImageElement>((resolve) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.src = blobUrl;
        });

        const tempId = `tmp-${genId()}`;
        const tempItem: LibraryItem = {
          id: tempId, libraryId: null, url: blobUrl, name: file.name,
          naturalW: img.naturalWidth, naturalH: img.naturalHeight,
          fileDPI, docWidthIn, docHeightIn, uploading: true,
        };
        setLibraryImages(prev => [tempItem, ...prev]);

        try {
          const metaRes = await fetch(apiUrl('/storage/uploads/request-url'), {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || 'application/octet-stream' }),
          });
          if (!metaRes.ok) throw new Error('presign failed');
          const { uploadURL, objectPath } = await metaRes.json() as { uploadURL: string; objectPath: string };

          await fetch(uploadURL, {
            method: 'PUT', body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });

          const stableUrl = apiUrl(`/storage/objects${objectPath.replace(/^\/objects/, '')}`);

          const libRes = await fetch(apiUrl('/library'), {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name, objectPath,
              naturalW: img.naturalWidth, naturalH: img.naturalHeight,
              fileDpi: fileDPI, docWidthIn, docHeightIn,
            }),
          });
          if (!libRes.ok) throw new Error('library save failed');
          const { image } = await libRes.json() as { image: { id: number } };

          URL.revokeObjectURL(blobUrl);
          setLibraryImages(prev => prev.map(i =>
            i.id === tempId
              ? { ...i, id: `lib-${image.id}`, libraryId: image.id, url: stableUrl, objectPath, uploading: false }
              : i
          ));
        } catch {
          setLibraryImages(prev => prev.filter(i => i.id !== tempId));
          URL.revokeObjectURL(blobUrl);
          toast({ title: 'Upload failed', description: `Could not upload ${file.name}.`, variant: 'destructive' });
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [auth.isLoggedIn, apiUrl, setLibraryImages, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'] },
    disabled: !auth.isLoggedIn || isUploading,
  });

  if (!auth.isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <BookImage size={40} className="text-gray-300" />
        <div>
          <p className="font-bold text-sm text-gray-800 mb-1">Image Library</p>
          <p className="text-xs text-gray-500">Log in to save images to your personal library and reuse them across all your projects.</p>
        </div>
        <button
          onClick={() => login('/builder')}
          className="flex items-center gap-2 px-4 py-2 bg-retro-pink text-white font-bold text-xs rounded border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform"
        >
          <LogIn size={14} /> Log In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-[2px] border-gray-200 flex-shrink-0">
        <span className="font-bold text-sm">Image Library</span>
        <button onClick={fetchLibrary} className="text-[10px] text-retro-pink hover:underline">
          Refresh
        </button>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`mx-3 mt-3 mb-2 border-[3px] border-dashed cursor-pointer p-3 text-center transition-colors flex flex-col items-center gap-1 flex-shrink-0 ${
          isDragActive ? 'border-retro-pink bg-retro-pink/10' : 'border-gray-400 bg-gray-50 hover:bg-retro-pink/5'
        } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <>
            <div className="w-8 h-8 rounded-full bg-retro-pink flex items-center justify-center">
              <Loader2 size={16} className="text-white animate-spin" />
            </div>
            <span className="font-bold text-xs text-gray-700">Uploading…</span>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-retro-pink flex items-center justify-center">
              <Upload size={16} className="text-white" />
            </div>
            <span className="font-bold text-xs text-gray-700">
              {isDragActive ? 'Drop to add to library' : 'Upload Image'}
            </span>
            <span className="text-[10px] text-gray-400">PNG, PDF, SVG, EPS, AI, JPG</span>
            <span className="text-[10px] text-gray-400">Max 1GB</span>
          </>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pb-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Search library..."
          value={libSearch}
          onChange={e => setLibSearch(e.target.value)}
          className="w-full text-xs px-2 py-1.5 border-[2px] border-gray-300 focus:border-retro-pink outline-none rounded"
        />
      </div>

      {/* Images grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoadingLibrary ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filteredLibImages.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            {libraryImages.length === 0
              ? 'Your library is empty. Upload images above to get started.'
              : 'No images match your search.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredLibImages.map(item => (
              <div key={item.id} className="relative group border-[2px] border-gray-200 rounded overflow-hidden bg-gray-50">
                {item.uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <Loader2 size={16} className="animate-spin text-retro-pink" />
                  </div>
                )}
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-20 object-contain cursor-pointer"
                  onClick={() => !item.uploading && addToCanvas(item)}
                  title={item.name}
                />
                <div className="px-1 py-0.5 text-[9px] text-gray-600 truncate">{item.name}</div>
                {/* Overlay: Add button (centered) + Delete (top-right) */}
                <button
                  onClick={() => !item.uploading && addToCanvas(item)}
                  title="Add to canvas"
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <div className="bg-retro-pink text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                    <Plus size={13} />
                  </div>
                </button>
                <button
                  onClick={() => onConfirmDeleteLibraryItem?.(item)}
                  title="Remove from library"
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-white text-red-500 rounded text-[10px] border border-black shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Builder() {
  const [, navigate] = useLocation();

  // Library
  const [library, setLibrary] = useState<UploadedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('images');
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [groupQtyInput, setGroupQtyInput] = useState('1');
  const [groupQuantityModalOpen, setGroupQuantityModalOpen] = useState(false);
  const [quantityInput, setQuantityInput] = useState('1');
  const [resizeModalOpen, setResizeModalOpen] = useState(false);
  const [resizeActiveTab, setResizeActiveTab] = useState('Full Front');
  const [pendingSize, setPendingSize] = useState<{ w: number; h: number } | null>(null);

  // Text tool
  const [textValue, setTextValue] = useState('');
  const [textFont, setTextFont] = useState('Impact');
  const [textColor, setTextColor] = useState('#000000');

  // Sheets
  const [sheets, setSheets] = useState<CanvasItem[][]>([[]]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [sheetNames, setSheetNames] = useState<string[]>(['Sheet 1']);
  const [renamingSheetIdx, setRenamingSheetIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteSheetIdx, setDeleteSheetIdx] = useState<number | null>(null);
  const [confirmDeleteCanvasItem, setConfirmDeleteCanvasItem] = useState(false);
  const [confirmDeleteLibraryItem, setConfirmDeleteLibraryItem] = useState<LibraryItem | null>(null);
  const [confirmDeleteProjectImageId, setConfirmDeleteProjectImageId] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<SavedProject | null>(null);

  // Download
  const [isExporting, setIsExporting] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  type CartAddStage = 'saving' | 'rendering' | 'uploading' | 'adding';
  const [cartAddProgress, setCartAddProgress] = useState<{
    stage: CartAddStage; tilesCurrent: number; tilesTotal: number;
  } | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Size / canvas
  const [canvasHeightIn, setCanvasHeightIn] = useState(12);
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [enableGap, setEnableGap] = useState<boolean>(() => {
    try { return localStorage.getItem('rp_enable_gap') !== 'false'; } catch { return true; }
  });
  const [gapIn, setGapIn] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('rp_gap_in') ?? '0.5');
      return isFinite(v) && v >= 0 ? v : 0.5;
    } catch { return 0.5; }
  });
  const [enableCollisionDetection, setEnableCollisionDetection] = useState<boolean>(() => {
    try { return localStorage.getItem('rp_enable_collision') !== 'false'; } catch { return true; }
  });
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try { return localStorage.getItem('rp_autosave') !== 'false'; } catch { return true; }
  });
  const AUTOSAVE_INTERVAL_OPTIONS = [30, 60, 120, 300] as const;
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<number>(() => {
    try {
      const v = parseInt(localStorage.getItem('rp_autosave_interval') ?? '30', 10);
      return [30, 60, 120, 300].includes(v) ? v : 30;
    } catch { return 30; }
  });
  const prevLibraryLenRef = useRef<number>(0);
  const prevProjectIdRef = useRef<number | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [renameProjectModalOpen, setRenameProjectModalOpen] = useState(false);
  const [renameTargetProjectId, setRenameTargetProjectId] = useState<number | null>(null);
  const [projectRenameValue, setProjectRenameValue] = useState('');

  // Selection
  const [selectedCanvasItems, setSelectedCanvasItems] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDrawingSelectionBox, setIsDrawingSelectionBox] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [resizeDisplay, setResizeDisplay] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

  // Collision detection during drag
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragConstrainedPos, setDragConstrainedPos] = useState<{ x: number; y: number } | null>(null);
  const dragConstrainedPosRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartGeomRef = useRef<{ x: number; y: number; width: number; height: number; preExistingOverlapIds: Set<string> } | null>(null);
  const resizeOverlapToastShownRef = useRef(false);
  const [collidingItemIds, setCollidingItemIds] = useState<Set<string>>(new Set());
  const [nudgeFlashIds, setNudgeFlashIds] = useState<Set<string>>(new Set());

  // Width/height/pos edits in panel
  const [editW, setEditW] = useState('');
  const [editH, setEditH] = useState('');
  const [editX, setEditX] = useState('');
  const [editY, setEditY] = useState('');

  // History (simple undo/redo)
  const [history, setHistory] = useState<CanvasItem[][][]>([[[]]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  // Refs so undo/redo/push never capture stale closures
  const sheetsRef = useRef<CanvasItem[][]>([[[]]]);
  const selectionBoxRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const activeSheetIndexRef = useRef(0);
  const arrowNudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeFlashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Kept current via a dedicated sync effect so the arrow-key handler always sees
  // the latest collision state without triggering event-listener re-registration.
  const nudgeCollisionRef = useRef<{ enableCollisionDetection: boolean; canvasItems: CanvasItem[] }>({
    enableCollisionDetection: true,
    canvasItems: [],
  });
  const historyRef = useRef<CanvasItem[][][]>([[[]]]);
  const historyIndexRef = useRef(0);
  const dragMovedRef = useRef(false);
  const justFinishedRubberBandRef = useRef(false);
  const draftLoadedRef = useRef(false);
  // Tracks the item most recently moved/resized so it isn't marked as a victim
  // in the reactive overlap effect — only the images it lands on get the red border.
  const lastMovedItemIdRef = useRef<string | null>(null);
  // Set to true inside the async block AFTER all state is applied — prevents the
  // save effect from firing with stale (empty) state before the load completes.
  const [draftLoadComplete, setDraftLoadComplete] = useState(false);

  // Project save/load
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [libraryImages, setLibraryImages] = useState<LibraryItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [showFromLibrary, setShowFromLibrary] = useState(false);
  const [fromLibrarySearch, setFromLibrarySearch] = useState('');
  const [gangSheetOrders, setGangSheetOrders] = useState<GangSheetOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const { addItem } = useCart();
  const { toast } = useToast();
  const { auth, login, checkSession } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const zoomBtnRef = useRef<HTMLButtonElement>(null);
  const anchorItemIdRef = useRef<string | null>(null);

  const PX_PER_INCH = PX_PER_INCH_BASE;
  const CANVAS_MIN_HEIGHT_IN = 12;
  const CANVAS_PADDING_IN = 2;
  const canvasHeight = Math.round(PX_PER_INCH * canvasHeightIn);
  const canvasItems: CanvasItem[] = sheets[activeSheetIndex] ?? [];

  const selectedItemIds = Array.from(selectedCanvasItems);
  const selectedItem = selectedItemIds.length === 1
    ? canvasItems.find(i => i.id === selectedItemIds[0]) ?? null
    : null;

  const px2in = (px: number) => (px / PX_PER_INCH).toFixed(2);
  const in2px = (val: string) => parseFloat(val) * PX_PER_INCH;

  // Sync edit fields with selected item
  useEffect(() => {
    if (selectedItem) {
      setEditW(px2in(selectedItem.width));
      setEditH(px2in(selectedItem.height));
      setEditX(px2in(selectedItem.x));
      setEditY(px2in(selectedItem.y));
    }
  }, [selectedItem?.id, selectedItem?.width, selectedItem?.height, selectedItem?.x, selectedItem?.y]);

  // Keep refs in sync with state so undo/redo never use stale values
  useEffect(() => { sheetsRef.current = sheets; }, [sheets]);
  useEffect(() => { selectionBoxRef.current = selectionBox; }, [selectionBox]);
  useEffect(() => { activeSheetIndexRef.current = activeSheetIndex; }, [activeSheetIndex]);
  // Keep nudgeCollisionRef current so the arrow-key handler always reads the latest
  // collision toggle and canvas items without needing them in its dep array.
  useEffect(() => {
    nudgeCollisionRef.current = { enableCollisionDetection, canvasItems };
  }, [enableCollisionDetection, canvasItems]);

  // When items settle (not dragging/resizing), recompute all pairwise overlaps so that
  // persistent red borders clear as soon as the overlap is actually resolved.
  useEffect(() => {
    if (draggingItemId || resizingItemId || !enableCollisionDetection) {
      return;
    }
    const culprit = lastMovedItemIdRef.current;
    const overlapIds = new Set<string>();
    for (let a = 0; a < canvasItems.length; a++) {
      for (let b = a + 1; b < canvasItems.length; b++) {
        const A = canvasItems[a], B = canvasItems[b];
        if (A.x < B.x + B.width && A.x + A.width > B.x &&
            A.y < B.y + B.height && A.y + A.height > B.y) {
          // Only mark the victim(s) — the culprit keeps its normal border
          if (A.id !== culprit) overlapIds.add(A.id);
          if (B.id !== culprit) overlapIds.add(B.id);
        }
      }
    }
    setCollidingItemIds(overlapIds);
  }, [canvasItems, draggingItemId, resizingItemId, enableCollisionDetection]);

  useEffect(() => { historyRef.current = history; }, [history]);

  // Push current sheets to history stack
  const recordHistory = useCallback((newSheets: CanvasItem[][]) => {
    const snap = newSheets.map(s => s.map(i => ({ ...i })));
    historyIndexRef.current++;
    historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current), snap];
    setHistory(historyRef.current);
    setHistoryIndex(historyIndexRef.current);
  }, []);

  // Update the active sheet, and optionally record to history
  const updateActiveSheet = useCallback((
    updater: CanvasItem[] | ((prev: CanvasItem[]) => CanvasItem[]),
    record = true,
  ) => {
    const currentSheets = sheetsRef.current;
    const newSheets = currentSheets.map(s => [...s]);
    newSheets[activeSheetIndex] = typeof updater === 'function'
      ? updater(newSheets[activeSheetIndex] ?? [])
      : [...updater];
    sheetsRef.current = newSheets;
    setSheets(newSheets);
    if (record) recordHistory(newSheets);
  }, [activeSheetIndex, recordHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const snap = historyRef.current[historyIndexRef.current];
      if (snap) {
        const restored = snap.map(s => s.map(i => ({ ...i })));
        sheetsRef.current = restored;
        setSheets(restored);
        setHistoryIndex(historyIndexRef.current);
      }
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const snap = historyRef.current[historyIndexRef.current];
      if (snap) {
        const restored = snap.map(s => s.map(i => ({ ...i })));
        sheetsRef.current = restored;
        setSheets(restored);
        setHistoryIndex(historyIndexRef.current);
      }
    }
  }, []);

  useEffect(() => {
    setSelectedCanvasItems(new Set());
  }, [activeSheetIndex]);

  useEffect(() => {
    if (activeSheetIndex >= sheets.length) setActiveSheetIndex(Math.max(0, sheets.length - 1));
  }, [sheets.length]);

  // Track window width reactively so the mobile guard re-evaluates on resize
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Auto-scale canvas
  useEffect(() => {
    const updateScale = () => {
      if (!canvasAreaRef.current) return;
      const rect = canvasAreaRef.current.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
      const RULER = 20;
      const availableW = rect.width - RULER - 48;
      const availableH = rect.height - RULER - 48;
      const base = Math.max(0.1, Math.min(availableW / CANVAS_BASE_WIDTH, availableH / canvasHeight));
      setCanvasScale(base * zoom);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    const el = canvasAreaRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [canvasHeightIn, canvasHeight, zoom]);

  // Canvas height tracks content exactly — grows on overflow, shrinks on delete/move-up.
  // All comparisons are done in pixels to avoid floating-point ceil rounding errors
  // (e.g. 12" canvas = 284.xx px → 284/23.63 = 12.02" → ceil = 13 — wrong).
  // IMPORTANT: we skip recalculation while any drag is in progress. Updating canvas height
  // mid-drag causes a feedback loop: height change → boundary change → collision/snap chaos.
  // The effect re-runs naturally once dragging ends and items are committed.
  useEffect(() => {
    if (draggingItemId || isDraggingSelection) return;

    if (!canvasItems.length) {
      setCanvasHeightIn(CANVAS_MIN_HEIGHT_IN);
      return;
    }
    const maxBottomPx = Math.max(...canvasItems.map(i => i.y + i.height));
    setCanvasHeightIn(prev => {
      const currentPx = Math.round(PX_PER_INCH * prev);

      // Use a 2px tolerance before growing to absorb floating-point placement noise.
      // Without this, dropping an item 1px past the edge causes a full 1" canvas jump.
      if (maxBottomPx > currentPx + 2) {
        // Items overflow the canvas — grow to fit
        const neededIn = maxBottomPx / PX_PER_INCH;
        return Math.min(MAX_HEIGHT_IN, Math.max(CANVAS_MIN_HEIGHT_IN, Math.ceil(neededIn)));
      }

      // Items fit — check if we can meaningfully shrink (e.g. after deletion / moving up).
      // Use ceil with a small FP tolerance (0.05") so that:
      //   - An image at 13.20" keeps a 14" canvas  (13.20 - 0.05 = 13.15 → ceil = 14)
      //   - An item at 12.022" (FP noise) still rounds to 12" (12.022 - 0.05 = 11.972 → ceil = 12)
      const FP_TOLERANCE_IN = 0.05;
      const shrinkToIn = Math.max(CANVAS_MIN_HEIGHT_IN, Math.ceil(maxBottomPx / PX_PER_INCH - FP_TOLERANCE_IN));
      const shrinkToPx = Math.round(PX_PER_INCH * shrinkToIn);
      // Only shrink if the result is actually shorter — guards against fp noise.
      return shrinkToPx < currentPx ? shrinkToIn : prev;
    });
  }, [canvasItems, draggingItemId, isDraggingSelection]);

  // Selection helpers
  const toggleCanvasItemSelection = (itemId: string, ctrlKey: boolean) => {
    setSelectedCanvasItems(prev => {
      const next = new Set(prev);
      if (ctrlKey) { next.has(itemId) ? next.delete(itemId) : next.add(itemId); }
      else { next.clear(); next.add(itemId); }
      return next;
    });
    anchorItemIdRef.current = itemId;
  };

  const handleItemMouseDown = (itemId: string, ctrlKey: boolean, shiftKey: boolean) => {
    if (shiftKey && anchorItemIdRef.current) {
      // Range select: add all items between the anchor and this item (inclusive)
      const anchorIdx = canvasItems.findIndex(i => i.id === anchorItemIdRef.current);
      const targetIdx = canvasItems.findIndex(i => i.id === itemId);
      if (anchorIdx !== -1 && targetIdx !== -1) {
        const lo = Math.min(anchorIdx, targetIdx);
        const hi = Math.max(anchorIdx, targetIdx);
        setSelectedCanvasItems(prev => {
          const next = new Set(prev);
          for (let k = lo; k <= hi; k++) next.add(canvasItems[k].id);
          return next;
        });
        return;
      }
    }
    if (!selectedCanvasItems.has(itemId)) toggleCanvasItemSelection(itemId, ctrlKey);
    else if (ctrlKey) toggleCanvasItemSelection(itemId, true);
    else anchorItemIdRef.current = itemId;
  };

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / canvasScale, y: (clientY - rect.top) / canvasScale };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    const clickedItem = canvasItems.find(item =>
      x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height
    );
    if (!clickedItem) {
      // Start drag-select; deselect on mouseup if nothing enclosed
      setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      setIsDrawingSelectionBox(true);
    } else if (selectedCanvasItems.size > 0) {
      setDragStartPos({ x, y });
      setIsDraggingSelection(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDrawingSelectionBox && selectionBox) {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
    if (isDraggingSelection && dragStartPos && !draggingItemId) {
      // Skip if Rnd is already handling the drag for a multi-selection item.
      // Rnd's onDrag will manage group movement in that case to avoid double-moving.
      const { x: cx, y: cy } = toCanvasCoords(e.clientX, e.clientY);
      const dx = cx - dragStartPos.x, dy = cy - dragStartPos.y;
      dragMovedRef.current = true;
      setDragStartPos({ x: cx, y: cy });

      if (enableCollisionDetection) {
        // Per-item collision detection: each selected item is checked individually so that
        // walls inside the gaps of the selection are not incorrectly skipped.
        const selectedItems = canvasItems.filter(i => selectedCanvasItems.has(i.id));
        const walls = canvasItems.filter(i => !selectedCanvasItems.has(i.id));

        if (selectedItems.length > 0) {
          const groupX = Math.min(...selectedItems.map(i => i.x));
          const groupY = Math.min(...selectedItems.map(i => i.y));
          const groupW = Math.max(...selectedItems.map(i => i.x + i.width)) - groupX;
          const groupH = Math.max(...selectedItems.map(i => i.y + i.height)) - groupY;

          // Clamp the group to canvas bounds first.
          const clampedDx = Math.max(0, Math.min(groupX + dx, CANVAS_BASE_WIDTH - groupW)) - groupX;
          const clampedDy = Math.max(0, Math.min(groupY + dy, canvasHeight - groupH)) - groupY;

          let resolvedDx = clampedDx;
          let resolvedDy = clampedDy;
          for (const selItem of selectedItems) {
            const { x: rx, y: ry } = resolveCollision(
              { width: selItem.width, height: selItem.height },
              selItem.x + clampedDx, selItem.y + clampedDy,
              selItem.x, selItem.y,
              walls,
            );
            const itemDx = rx - selItem.x;
            const itemDy = ry - selItem.y;
            if (clampedDx >= 0) resolvedDx = Math.min(resolvedDx, itemDx);
            else resolvedDx = Math.max(resolvedDx, itemDx);
            if (clampedDy >= 0) resolvedDy = Math.min(resolvedDy, itemDy);
            else resolvedDy = Math.max(resolvedDy, itemDy);
          }

          updateActiveSheet(prev => prev.map(item =>
            selectedCanvasItems.has(item.id)
              ? { ...item, x: item.x + resolvedDx, y: item.y + resolvedDy }
              : item
          ), false);
        }
      } else {
        updateActiveSheet(prev => prev.map(item =>
          selectedCanvasItems.has(item.id)
            ? { ...item, x: Math.max(0, item.x + dx), y: Math.max(0, item.y + dy) }
            : item
        ), false);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingSelectionBox && selectionBox) {
      setIsDrawingSelectionBox(false);
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      const found = new Set<string>();
      for (const item of canvasItems) {
        if (!(maxX < item.x || minX > item.x + item.width || maxY < item.y || minY > item.y + item.height))
          found.add(item.id);
      }
      if (found.size > 0) setSelectedCanvasItems(found);
      else setSelectedCanvasItems(new Set());
      setSelectionBox(null);
    }
    if (isDraggingSelection) {
      if (dragMovedRef.current) {
        recordHistory(sheetsRef.current);
        dragMovedRef.current = false;
      }
      setIsDraggingSelection(false);
      setDragStartPos(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCanvasItems.size > 0) removeSelectedCanvasItems();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelectedItems(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCanvasItems, historyIndex, history]);

  // When a rubber-band selection drag is in progress, attach global mousemove/mouseup
  // listeners so that moving the cursor outside the canvas does NOT cancel the selection.
  // The selection box is clamped to canvas bounds; releasing outside still finalises it.
  useEffect(() => {
    if (!isDrawingSelectionBox) return;

    const handleGlobalMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = (e.clientX - rect.left) / canvasScale;
      const rawY = (e.clientY - rect.top) / canvasScale;
      const x = Math.max(0, Math.min(rawX, CANVAS_BASE_WIDTH));
      const y = Math.max(0, Math.min(rawY, canvasHeightIn * PX_PER_INCH));
      // Update the ref synchronously so handleGlobalUp always sees the latest box
      // even if React hasn't re-rendered yet between the move and the release.
      if (selectionBoxRef.current) {
        selectionBoxRef.current = { ...selectionBoxRef.current, endX: x, endY: y };
      }
      setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    };

    const handleGlobalUp = () => {
      setIsDrawingSelectionBox(false);
      const box = selectionBoxRef.current;
      if (box) {
        const minX = Math.min(box.startX, box.endX);
        const maxX = Math.max(box.startX, box.endX);
        const minY = Math.min(box.startY, box.endY);
        const maxY = Math.max(box.startY, box.endY);
        const items = sheetsRef.current[activeSheetIndexRef.current] ?? [];
        const found = new Set<string>();
        for (const item of items) {
          if (!(maxX < item.x || minX > item.x + item.width || maxY < item.y || minY > item.y + item.height))
            found.add(item.id);
        }
        setSelectedCanvasItems(found.size > 0 ? found : new Set());
        setSelectionBox(null);
        // Suppress the click that the browser fires on the scroll container
        // (common ancestor of the canvas mousedown and the out-of-canvas mouseup),
        // which would otherwise immediately clear the selection we just made.
        justFinishedRubberBandRef.current = true;
        setTimeout(() => { justFinishedRubberBandRef.current = false; }, 0);
      }
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isDrawingSelectionBox, canvasScale, canvasHeightIn]);

  // Arrow-key nudge — move selected items 1px (or 10px with Shift).
  // Respects collision detection (same group/single logic as drag) when enabled.
  // Each keydown moves without recording to avoid flooding undo history on key-repeat.
  // A 300ms debounce records one single undo entry after the nudge sequence ends.
  useEffect(() => {
    const SMALL_STEP = 1;
    const LARGE_STEP = 10;

    const onArrow = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      if (selectedCanvasItems.size === 0) return;

      e.preventDefault(); // stop page from scrolling

      const step = e.shiftKey ? LARGE_STEP : SMALL_STEP;
      const rawDx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const rawDy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;

      const { enableCollisionDetection: collisionOn, canvasItems: items } = nudgeCollisionRef.current;
      const walls         = items.filter(i => !selectedCanvasItems.has(i.id));
      const selectedItems = items.filter(i =>  selectedCanvasItems.has(i.id));
      if (selectedItems.length === 0) return;

      let resolvedDx = rawDx;
      let resolvedDy = rawDy;

      let nudgeCollidingIds = new Set<string>();

      if (collisionOn) {
        if (selectedItems.length === 1) {
          // Single item: resolve individually, same as per-item drag collision.
          const item = selectedItems[0];
          const proposedX = Math.max(0, Math.min(CANVAS_BASE_WIDTH - item.width, item.x + rawDx));
          const proposedY = Math.max(0, item.y + rawDy);
          const { x, y, collidingIds } = resolveCollision(item, proposedX, proposedY, item.x, item.y, walls);
          resolvedDx = x - item.x;
          resolvedDy = y - item.y;
          nudgeCollidingIds = collidingIds;
        } else {
          // Multi-select: treat the whole selection as one virtual rectangle,
          // matching the group-drag collision behaviour exactly.
          const groupX = Math.min(...selectedItems.map(i => i.x));
          const groupY = Math.min(...selectedItems.map(i => i.y));
          const groupW = Math.max(...selectedItems.map(i => i.x + i.width))  - groupX;
          const groupH = Math.max(...selectedItems.map(i => i.y + i.height)) - groupY;
          const proposedGX = Math.max(0, Math.min(groupX + rawDx, CANVAS_BASE_WIDTH - groupW));
          const proposedGY = Math.max(0, groupY + rawDy);
          const { x: rgx, y: rgy, collidingIds } = resolveCollision(
            { width: groupW, height: groupH },
            proposedGX, proposedGY,
            groupX, groupY,
            walls,
          );
          resolvedDx = rgx - groupX;
          resolvedDy = rgy - groupY;
          nudgeCollidingIds = collidingIds;
        }
      }

      // Flash the bounding box of any blocking item twice so the user can see what stopped them.
      if (nudgeCollidingIds.size > 0) {
        nudgeFlashTimersRef.current.forEach(t => clearTimeout(t));
        const captured = new Set(nudgeCollidingIds);
        setNudgeFlashIds(captured);                                             // on  (0ms)
        const t1 = setTimeout(() => setNudgeFlashIds(new Set()),    150);       // off (150ms)
        const t2 = setTimeout(() => setNudgeFlashIds(captured),     300);       // on  (300ms)
        const t3 = setTimeout(() => setNudgeFlashIds(new Set()),    450);       // off (450ms)
        nudgeFlashTimersRef.current = [t1, t2, t3];
      }

      // Apply the (possibly collision-clamped) delta — no history entry yet
      updateActiveSheet(prev => prev.map(item => {
        if (!selectedCanvasItems.has(item.id)) return item;
        return {
          ...item,
          x: Math.max(0, Math.min(CANVAS_BASE_WIDTH - item.width, item.x + resolvedDx)),
          y: Math.max(0, item.y + resolvedDy),
        };
      }), false);

      // Debounce: record one undo entry 300ms after the last keypress in the sequence
      if (arrowNudgeTimerRef.current) clearTimeout(arrowNudgeTimerRef.current);
      arrowNudgeTimerRef.current = setTimeout(() => {
        recordHistory(sheetsRef.current);
      }, 300);
    };

    window.addEventListener('keydown', onArrow);
    return () => {
      window.removeEventListener('keydown', onArrow);
      if (arrowNudgeTimerRef.current) clearTimeout(arrowNudgeTimerRef.current);
      nudgeFlashTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, [selectedCanvasItems, updateActiveSheet, recordHistory]);

  // Item actions
  const removeSelectedCanvasItems = () => {
    if (selectedCanvasItems.size > 0) {
      setConfirmDeleteCanvasItem(true);
    }
  };

  const doDeleteCanvasItems = () => {
    updateActiveSheet(prev => prev.filter(item => !selectedCanvasItems.has(item.id)));
    setSelectedCanvasItems(new Set());
    setConfirmDeleteCanvasItem(false);
  };

  const duplicateSelectedItems = () => {
    // Read from the ref so rapid successive calls (e.g. Ctrl+D held down) always
    // see the result of the previous duplication, not stale React state.
    const liveSheets = sheetsRef.current;
    const liveItems = liveSheets[activeSheetIndex] ?? [];
    const toDup = liveItems.filter(item => selectedCanvasItems.has(item.id));
    if (!toDup.length) return;

    const GAP = enableGap ? Math.round(gapIn * PX_PER_INCH) : 0;
    const MAX_HEIGHT_PX = Math.round(MAX_HEIGHT_IN * PX_PER_INCH);
    const nextSheets = liveSheets.map(s => [...s]);
    const nextNames = [...sheetNames];
    let targetIdx = nextSheets.length - 1;
    const newIds = new Set<string>();

    // Returns the y-coordinate of the bottom edge of the lowest item on a sheet.
    const sheetBottom = (items: CanvasItem[]) =>
      items.length > 0 ? Math.max(...items.map(i => i.y + i.height)) : 0;

    // Appends copies to a sheet, placing them below ALL existing items (not just
    // the selection). For single items we also try fitting to the right of the
    // bottom row first; for groups we always go below everything to avoid
    // accidentally landing on top of other items.
    const placeOnSheet = (sheetItems: CanvasItem[]): { x: number; y: number } | null => {
      const allBottom = sheetBottom(sheetItems);

      if (toDup.length === 1) {
        const { width: w, height: h } = toDup[0];
        // Try right of the bottom row
        const maxItemY = sheetItems.length > 0 ? Math.max(...sheetItems.map(i => i.y)) : 0;
        const bottomRowItems = sheetItems.filter(i => Math.abs(i.y - maxItemY) <= 10);
        const bottomRowRight = bottomRowItems.length > 0
          ? Math.max(...bottomRowItems.map(i => i.x + i.width))
          : 0;
        const effectiveGap = Math.max(MIN_GAP_PX, GAP);
        if (sheetItems.length === 0 || bottomRowRight + effectiveGap + w <= CANVAS_BASE_WIDTH) {
          const candidate = { x: bottomRowRight + effectiveGap, y: maxItemY };
          if (candidate.y + h <= MAX_HEIGHT_PX) return candidate;
        }
        // Below everything
        const candidate = { x: 0, y: allBottom + effectiveGap };
        if (candidate.y + h <= MAX_HEIGHT_PX) return candidate;
        return null; // doesn't fit
      } else {
        // Group: mirror single-item logic — try right of the bottom row first,
        // then below all items, then signal a new sheet is needed.
        // Use the measured average gap between items in the group (not the global
        // gap setting) for spacing, as the user expects.
        const groupMinX = Math.min(...toDup.map(i => i.x));
        const groupMaxX = Math.max(...toDup.map(i => i.x + i.width));
        const groupWidth = groupMaxX - groupMinX;
        const groupMaxY = Math.max(...toDup.map(i => i.y + i.height));
        const groupMinY = Math.min(...toDup.map(i => i.y));
        const groupHeight = groupMaxY - groupMinY;

        // ── Measure gaps by grouping items into rows and columns ──────────
        // The previous approach (sort by X/Y then look at consecutive pairs) missed
        // cross-row pairs because items from different rows rarely overlap in the
        // perpendicular axis, so measuredVGaps was always empty and avgVGap wrongly
        // fell back to the horizontal gap.  This grouping approach is correct for
        // grids of any size.

        // Group into rows (same approximate Y)
        const rowGroups: CanvasItem[][] = [];
        for (const item of toDup) {
          const found = rowGroups.find(r => Math.abs(r[0].y - item.y) <= 10);
          if (found) found.push(item);
          else rowGroups.push([item]);
        }
        rowGroups.sort((a, b) => Math.min(...a.map(i => i.y)) - Math.min(...b.map(i => i.y)));

        // Vertical gap = gap between the bottom edge of row k and the top edge of row k+1
        const measuredVGaps: number[] = [];
        for (let k = 0; k + 1 < rowGroups.length; k++) {
          const rowBottom = Math.max(...rowGroups[k].map(i => i.y + i.height));
          const nextRowTop = Math.min(...rowGroups[k + 1].map(i => i.y));
          measuredVGaps.push(Math.max(0, nextRowTop - rowBottom));
        }
        const avgVGap = Math.max(MIN_GAP_PX, measuredVGaps.length > 0
          ? Math.round(measuredVGaps.reduce((s, v) => s + v, 0) / measuredVGaps.length)
          : GAP);

        // Group into columns (same approximate X)
        const colGroups: CanvasItem[][] = [];
        for (const item of toDup) {
          const found = colGroups.find(c => Math.abs(c[0].x - item.x) <= 10);
          if (found) found.push(item);
          else colGroups.push([item]);
        }
        colGroups.sort((a, b) => Math.min(...a.map(i => i.x)) - Math.min(...b.map(i => i.x)));

        // Horizontal gap = gap between the right edge of column k and the left edge of column k+1
        const measuredHGaps: number[] = [];
        for (let k = 0; k + 1 < colGroups.length; k++) {
          const colRight = Math.max(...colGroups[k].map(i => i.x + i.width));
          const nextColLeft = Math.min(...colGroups[k + 1].map(i => i.x));
          measuredHGaps.push(Math.max(0, nextColLeft - colRight));
        }
        const avgHGap = Math.max(MIN_GAP_PX, measuredHGaps.length > 0
          ? Math.round(measuredHGaps.reduce((s, v) => s + v, 0) / measuredHGaps.length)
          : GAP);

        if (sheetItems.length === 0) {
          return { x: 0, y: 0 };
        }

        // Build a list of distinct rows sorted top-to-bottom, tracking the
        // rightmost occupied x in each row.
        const allRows: { canonY: number; right: number }[] = [];
        for (const item of sheetItems) {
          const bucket = allRows.find(r => Math.abs(r.canonY - item.y) <= 10);
          if (bucket) {
            bucket.right = Math.max(bucket.right, item.x + item.width);
            bucket.canonY = Math.min(bucket.canonY, item.y);
          } else {
            allRows.push({ canonY: item.y, right: item.x + item.width });
          }
        }
        allRows.sort((a, b) => a.canonY - b.canonY);

        // Search rows from the group's current row downward for available space.
        for (const row of allRows) {
          if (row.canonY >= groupMinY - 10) {
            if (row.right + avgHGap + groupWidth <= CANVAS_BASE_WIDTH) {
              const candidate = { x: row.right + avgHGap, y: row.canonY };
              if (candidate.y + groupHeight <= MAX_HEIGHT_PX) return candidate;
            }
          }
        }

        // No existing row has space — place below all items, keeping the
        // same horizontal starting position as the original group so every
        // item in the duplicate lands in exactly the same column as its
        // original counterpart.
        const candidate = { x: groupMinX, y: allBottom + avgVGap };
        if (candidate.y + groupHeight <= MAX_HEIGHT_PX) return candidate;
        return null; // doesn't fit on this sheet
      }
    };

    const currentSheet = nextSheets[targetIdx] ?? [];
    const pos = placeOnSheet(currentSheet);

    if (pos === null) {
      // Doesn't fit on the current last sheet — create a new one
      targetIdx = nextSheets.length;
      nextSheets.push([]);
      nextNames.push(`Sheet ${nextNames.length + 1}`);
    }

    // Build the new items at the resolved position
    if (toDup.length === 1) {
      const item = toDup[0];
      const { x, y } = pos ?? { x: 0, y: 0 };
      const newId = genId();
      newIds.add(newId);
      nextSheets[targetIdx] = [...(nextSheets[targetIdx] ?? []), { ...item, id: newId, x, y }];
    } else {
      const groupMinX = Math.min(...toDup.map(i => i.x));
      const groupMinY = Math.min(...toDup.map(i => i.y));
      const resolvedLeft = pos ? pos.x : groupMinX;
      const resolvedTop = pos ? pos.y : 0;

      // Snap items into visual rows (±10 px tolerance) and normalise every item
      // in the same row to that row's minimum y.  This ensures that even if the
      // originals have tiny y-offsets from manual placement, the duplicate comes
      // out perfectly top-aligned within each row.
      const rowBuckets: { canonicalY: number; ids: Set<string> }[] = [];
      for (const item of toDup) {
        const bucket = rowBuckets.find(b => Math.abs(b.canonicalY - item.y) <= 10);
        if (bucket) {
          bucket.canonicalY = Math.min(bucket.canonicalY, item.y);
          bucket.ids.add(item.id);
        } else {
          rowBuckets.push({ canonicalY: item.y, ids: new Set([item.id]) });
        }
      }
      const normalizedItemY = new Map<string, number>();
      for (const bucket of rowBuckets) {
        for (const id of bucket.ids) normalizedItemY.set(id, bucket.canonicalY);
      }

      // Same approach for columns — snap items in the same visual column to a
      // single canonical x so that column alignment is consistent across all rows
      // of the duplicate (the skyline packer can produce slightly different x
      // values per row for what should be the same column).
      const colBuckets: { canonicalX: number; ids: Set<string> }[] = [];
      for (const item of toDup) {
        const bucket = colBuckets.find(b => Math.abs(b.canonicalX - item.x) <= 10);
        if (bucket) {
          bucket.canonicalX = Math.min(bucket.canonicalX, item.x);
          bucket.ids.add(item.id);
        } else {
          colBuckets.push({ canonicalX: item.x, ids: new Set([item.id]) });
        }
      }
      const normalizedItemX = new Map<string, number>();
      for (const bucket of colBuckets) {
        for (const id of bucket.ids) normalizedItemX.set(id, bucket.canonicalX);
      }

      for (const item of toDup) {
        const normX = normalizedItemX.get(item.id) ?? item.x;
        const normY = normalizedItemY.get(item.id) ?? item.y;
        const dx = normX - groupMinX;
        const dy = normY - groupMinY;
        const newId = genId();
        newIds.add(newId);
        nextSheets[targetIdx] = [
          ...(nextSheets[targetIdx] ?? []),
          { ...item, id: newId, x: resolvedLeft + dx, y: resolvedTop + dy },
        ];
      }
    }

    // Update the ref synchronously so back-to-back duplications (rapid Ctrl+D)
    // always see the freshly placed items rather than stale React state.
    sheetsRef.current = nextSheets;
    setSheets(nextSheets);
    setSheetNames(nextNames);
    setActiveSheetIndex(targetIdx);
    setSelectedCanvasItems(newIds);
    recordHistory(nextSheets);
    toast({ title: 'Duplicated!', description: `${toDup.length} item(s) duplicated.` });
  };

  const addQuantity = (count: number) => {
    if (!selectedItem || count < 1) return;
    const GAP = Math.max(MIN_GAP_PX, enableGap ? Math.round(gapIn * PX_PER_INCH) : 0);
    const MAX_HEIGHT_PX = Math.round(MAX_HEIGHT_IN * PX_PER_INCH);
    const { width: w, height: h } = selectedItem;

    const findPos = (items: CanvasItem[]) => {
      if (items.length === 0) return { x: 0, y: 0 };
      const maxY = Math.max(...items.map(i => i.y));
      const lastRowItems = items.filter(i => Math.abs(i.y - maxY) <= 10);
      const lastRowRight = Math.max(...lastRowItems.map(i => i.x + i.width));
      if (lastRowRight + GAP + w <= CANVAS_BASE_WIDTH) return { x: lastRowRight + GAP, y: maxY };
      return { x: 0, y: Math.max(...items.map(i => i.y + i.height)) + GAP };
    };

    const nextSheets = sheets.map(s => [...s]);
    const nextNames = [...sheetNames];
    let targetIdx = nextSheets.length - 1;

    for (let i = 0; i < count; i++) {
      let { x, y } = findPos(nextSheets[targetIdx] ?? []);
      if (y + h > MAX_HEIGHT_PX) {
        targetIdx = nextSheets.length;
        nextSheets.push([]);
        nextNames.push(`Sheet ${nextNames.length + 1}`);
        x = 0; y = 0;
      }
      nextSheets[targetIdx] = [...(nextSheets[targetIdx] ?? []), { ...selectedItem, id: genId(), x, y }];
    }

    setSheets(nextSheets);
    setSheetNames(nextNames);
    setActiveSheetIndex(targetIdx);
    setQuantityModalOpen(false);
    toast({ title: `${count} copies added!`, description: 'Images placed on canvas.' });
  };

  // Adds N copies of the currently-selected group, placing each copy sequentially
  // below the previous one while preserving the exact horizontal layout and spacing.
  const addGroupQuantity = (count: number) => {
    const toDup = canvasItems.filter(item => selectedCanvasItems.has(item.id));
    if (toDup.length === 0 || count < 1) return;

    const GAP = Math.max(MIN_GAP_PX, enableGap ? Math.round(gapIn * PX_PER_INCH) : 0);
    const MAX_HEIGHT_PX = Math.round(MAX_HEIGHT_IN * PX_PER_INCH);

    const groupMinX = Math.min(...toDup.map(i => i.x));
    const groupMinY = Math.min(...toDup.map(i => i.y));
    const groupMaxY = Math.max(...toDup.map(i => i.y + i.height));
    const groupHeight = groupMaxY - groupMinY;

    // Snap items into visual rows and normalise y within each row
    const rowBuckets: { canonicalY: number; ids: Set<string> }[] = [];
    for (const item of toDup) {
      const bucket = rowBuckets.find(b => Math.abs(b.canonicalY - item.y) <= 10);
      if (bucket) { bucket.canonicalY = Math.min(bucket.canonicalY, item.y); bucket.ids.add(item.id); }
      else rowBuckets.push({ canonicalY: item.y, ids: new Set([item.id]) });
    }
    const normalizedItemY = new Map<string, number>();
    for (const bucket of rowBuckets) for (const id of bucket.ids) normalizedItemY.set(id, bucket.canonicalY);

    // Measure average vertical gap between rows inside the group; fall back to GAP
    const sortedByY = [...toDup].sort((a, b) => a.y - b.y);
    const measuredVGaps: number[] = [];
    for (let k = 0; k < sortedByY.length - 1; k++) {
      const a = sortedByY[k], b = sortedByY[k + 1];
      if (a.x < b.x + b.width && b.x < a.x + a.width)
        measuredVGaps.push(Math.max(0, b.y - (a.y + a.height)));
    }
    const vGap = measuredVGaps.length > 0
      ? Math.round(measuredVGaps.reduce((s, v) => s + v, 0) / measuredVGaps.length)
      : GAP;

    const nextSheets = sheets.map(s => [...s]);
    const nextNames = [...sheetNames];
    let targetIdx = nextSheets.length - 1;
    const newIds = new Set<string>();

    let prevBottom = groupMaxY; // bottom edge of the last placed group

    for (let n = 0; n < count; n++) {
      let resolvedTop = prevBottom + vGap;

      if (resolvedTop + groupHeight > MAX_HEIGHT_PX) {
        // Overflow — start a new sheet
        targetIdx = nextSheets.length;
        nextSheets.push([]);
        nextNames.push(`Sheet ${nextNames.length + 1}`);
        resolvedTop = 0;
      }

      for (const item of toDup) {
        const normY = normalizedItemY.get(item.id) ?? item.y;
        const dx = item.x - groupMinX;
        const dy = normY - groupMinY;
        const newId = genId();
        newIds.add(newId);
        nextSheets[targetIdx] = [
          ...(nextSheets[targetIdx] ?? []),
          { ...item, id: newId, x: groupMinX + dx, y: resolvedTop + dy },
        ];
      }
      prevBottom = resolvedTop + groupHeight;
    }

    setSheets(nextSheets);
    setSheetNames(nextNames);
    setActiveSheetIndex(targetIdx);
    setSelectedCanvasItems(newIds);
    setGroupQuantityModalOpen(false);
    setGroupQtyInput('1');
    toast({ title: `${count} group cop${count === 1 ? 'y' : 'ies'} added!`, description: `${toDup.length * count} images placed on canvas.` });
  };

  const STANDARD_SIZES: Record<string, { groups: { label: string; sizes: { name: string; w: number; h: number }[] }[] }> = {
    'Full Front': { groups: [
      { label: 'Adult',   sizes: [{ name: 'XS - S', w: 10, h: 12 }, { name: 'M - L', w: 11, h: 14 }, { name: 'XL', w: 12, h: 14 }, { name: 'XXL+', w: 13, h: 15 }] },
      { label: 'Youth',   sizes: [{ name: 'XS - S', w: 7, h: 7 }, { name: 'M - L', w: 8, h: 8 }, { name: 'XL', w: 9, h: 9 }] },
      { label: 'Toddler', sizes: [{ name: '5T - 6T', w: 6, h: 6 }, { name: '2T - 4T', w: 5, h: 5 }] },
      { label: 'Infant',  sizes: [{ name: '6M - 24M', w: 4, h: 4 }, { name: 'Newborn', w: 3, h: 3 }] },
    ]},
    'Full Back': { groups: [
      { label: 'Adult',   sizes: [{ name: 'XS - M', w: 10, h: 13 }, { name: 'L+', w: 12, h: 15 }] },
      { label: 'Youth',   sizes: [{ name: 'XS - S', w: 9, h: 12 }, { name: 'M+', w: 10, h: 13 }] },
      { label: 'Toddler', sizes: [{ name: 'All', w: 8, h: 10 }] },
      { label: 'Infant',  sizes: [{ name: 'All', w: 6, h: 8 }] },
    ]},
    'Back Collar': { groups: [
      { label: 'Adult',   sizes: [{ name: 'XS - L', w: 3, h: 3 }, { name: 'L+', w: 3.5, h: 3.5 }] },
      { label: 'Youth',   sizes: [{ name: 'All', w: 2.5, h: 2.5 }] },
      { label: 'Toddler', sizes: [{ name: 'All', w: 2, h: 2 }] },
      { label: 'Infant',  sizes: [{ name: 'All', w: 1.75, h: 1.75 }] },
    ]},
    'Left Chest': { groups: [
      { label: 'Adult',   sizes: [{ name: 'Standard', w: 3.5, h: 3.5 }, { name: 'Large', w: 4, h: 4 }] },
      { label: 'Youth',   sizes: [{ name: 'Standard', w: 3, h: 3 }] },
    ]},
    'Sleeve': { groups: [
      { label: 'Adult',   sizes: [{ name: 'Standard', w: 3, h: 3.5 }, { name: 'Large', w: 4, h: 4.5 }] },
      { label: 'Youth',   sizes: [{ name: 'Standard', w: 2.5, h: 3 }] },
    ]},
    'Hat': { groups: [
      { label: 'Front Panel', sizes: [{ name: 'Small', w: 2, h: 2.5 }, { name: 'Standard', w: 2.25, h: 3.5 }, { name: 'Large', w: 2.5, h: 4 }] },
      { label: 'Side Panel',  sizes: [{ name: 'Standard', w: 2, h: 3 }] },
    ]},
  };

  const applyStandardSize = (targetWIn: number, targetHIn: number) => {
    if (!selectedItem) return;
    const targetWPx = targetWIn * PX_PER_INCH;
    const targetHPx = targetHIn * PX_PER_INCH;
    // Fit within target box maintaining current displayed aspect ratio
    const ar = selectedItem.width / selectedItem.height;
    let newW: number, newH: number;
    if (ar > targetWPx / targetHPx) {
      newW = Math.round(targetWPx);
      newH = Math.round(targetWPx / ar);
    } else {
      newH = Math.round(targetHPx);
      newW = Math.round(targetHPx * ar);
    }
    // Build updated items with the resized item, then re-pack so everything
    // stays inside the canvas and nothing overlaps.
    const updatedItem = { ...selectedItem, width: newW, height: newH };
    const updatedItems = canvasItems.map(i => i.id === selectedItem.id ? updatedItem : i);
    // Use a sheetH large enough that the newly-resized item is never wrongly
    // classified as overflow just because it is taller than the current canvas.
    // We deliberately do NOT use totalItemsH here — that would make the sheet
    // infinitely tall and suppress all overflow, putting every item on one
    // enormous sheet instead of spilling to a new one when needed.
    const effectiveSheetH = Math.max(canvasHeight, newH);
    const packed = packAllSheets(updatedItems, effectiveSheetH);
    let nextSheetNum = getNextSheetNumber();
    setSheets(prev => {
      const next = [...prev];
      packed.forEach((sheet, i) => {
        const idx = activeSheetIndex + i;
        if (idx < next.length) {
          next[idx] = sheet;
        } else {
          next.push(sheet);
          setSheetNames(names => [...names, `Sheet ${nextSheetNum++}`]);
        }
      });
      return next;
    });
    setResizeModalOpen(false);
    toast({ title: 'Resized!', description: `Fit to ${targetWIn}" × ${targetHIn}" — canvas re-arranged.` });
  };

  type AlignType =
    | 'edge-top'  | 'edge-bottom' | 'edge-left'  | 'edge-right'
    | 'center-h'  | 'center-v'
    | 'top-left'    | 'top-center'    | 'top-right'
    | 'middle-left' | 'middle-center' | 'middle-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

  const alignItems = (type: AlignType) => {
    const selected = canvasItems.filter(i => selectedCanvasItems.has(i.id));
    if (selected.length === 0) return;

    // Bounding box of the group
    const groupLeft   = Math.min(...selected.map(i => i.x));
    const groupRight  = Math.max(...selected.map(i => i.x + i.width));
    const groupTop    = Math.min(...selected.map(i => i.y));
    const groupBottom = Math.max(...selected.map(i => i.y + i.height));
    const groupW = groupRight - groupLeft;
    const groupH = groupBottom - groupTop;

    // Snap reference is the actual canvas bottom edge.
    // The canvas no longer auto-grows from dragging, so this is safe to use directly.
    const snapBottom = canvasHeight;

    // Single offset for the whole group — preserves internal spacing
    let dx = 0, dy = 0;

    // Single-axis edge snaps (only one direction moves)
    if (type === 'edge-top')    { dy = 0 - groupTop;                    return updateActiveSheet(prev => prev.map(i => selectedCanvasItems.has(i.id) ? { ...i, y: i.y + dy } : i)); }
    if (type === 'edge-bottom') { dy = snapBottom - groupBottom;        return updateActiveSheet(prev => prev.map(i => selectedCanvasItems.has(i.id) ? { ...i, y: i.y + dy } : i)); }
    if (type === 'edge-left')   { dx = 0 - groupLeft;                   return updateActiveSheet(prev => prev.map(i => selectedCanvasItems.has(i.id) ? { ...i, x: i.x + dx } : i)); }
    if (type === 'edge-right')  { dx = CANVAS_BASE_WIDTH - groupRight;  return updateActiveSheet(prev => prev.map(i => selectedCanvasItems.has(i.id) ? { ...i, x: i.x + dx } : i)); }
    // Center on canvas — single axis only
    if (type === 'center-h') { dx = (CANVAS_BASE_WIDTH - groupW) / 2 - groupLeft; return updateActiveSheet(prev => prev.map(i => selectedCanvasItems.has(i.id) ? { ...i, x: i.x + dx } : i)); }
    if (type === 'center-v') { dy = (snapBottom - groupH) / 2 - groupTop;         return updateActiveSheet(prev => prev.map(i => selectedCanvasItems.has(i.id) ? { ...i, y: i.y + dy } : i)); }

    // Combined position snaps
    const [vAlign, hAlign] = type.split('-') as [string, string];
    if (hAlign === 'left')   dx = 0 - groupLeft;
    if (hAlign === 'center') dx = (CANVAS_BASE_WIDTH - groupW) / 2 - groupLeft;
    if (hAlign === 'right')  dx = CANVAS_BASE_WIDTH - groupRight;
    if (vAlign === 'top')    dy = 0 - groupTop;
    if (vAlign === 'middle') dy = (snapBottom - groupH) / 2 - groupTop;
    if (vAlign === 'bottom') dy = snapBottom - groupBottom;

    updateActiveSheet(prev => prev.map(item => {
      if (!selectedCanvasItems.has(item.id)) return item;
      return { ...item, x: item.x + dx, y: item.y + dy };
    }));
  };

  const flipSelectedItems = (axis: 'h' | 'v') => {
    if (selectedCanvasItems.size === 0) return;
    updateActiveSheet(prev => prev.map(item => {
      if (!selectedCanvasItems.has(item.id)) return item;
      return axis === 'h'
        ? { ...item, flipH: !item.flipH }
        : { ...item, flipV: !item.flipV };
    }));
  };

  const upscaleSelectedItem = async () => {
    if (!selectedItem || isUpscaling) return;

    // Derive objectPath from the item URL: ".../api/storage/objects/uploads/<uuid>"
    // → "/objects/uploads/<uuid>"
    const urlStr = selectedItem.url;
    const objMatch = urlStr.match(/\/storage\/objects(\/[^\?#]+)/);
    if (!objMatch) {
      toast({ title: 'Cannot upscale', description: 'Image URL is not a stored object.', variant: 'destructive' });
      return;
    }
    const objectPath = `/objects${objMatch[1]}`;

    setIsUpscaling(true);
    try {
      const res = await fetch(apiUrl('/upscale'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectPath, scale: 2 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Upscale failed');
      }
      const { objectPath: newObjectPath, width: newW, height: newH } = await res.json() as {
        objectPath: string; width: number; height: number;
      };

      const newUrl = apiUrl(`/storage/objects${newObjectPath.replace(/^\/objects/, '')}`);
      const newFileDPI = 300;
      const px3 = (v: number) => Math.round(v * 1000) / 1000;
      const newCanvasW = px3((newW / newFileDPI) * PX_PER_INCH_BASE);
      const newCanvasH = px3((newH / newFileDPI) * PX_PER_INCH_BASE);

      updateActiveSheet(prev => prev.map(item =>
        item.id === selectedItem.id
          ? { ...item, url: newUrl, naturalW: newW, naturalH: newH, fileDPI: newFileDPI, width: newCanvasW, height: newCanvasH }
          : item
      ));

      // Also update the library entry so re-adds use the upscaled image
      setLibrary(prev => prev.map(img =>
        img.id === selectedItem.imageId
          ? { ...img, url: newUrl, objectPath: newObjectPath, naturalW: newW, naturalH: newH, fileDPI: newFileDPI }
          : img
      ));

      toast({ title: 'Upscaled 2×!', description: `Now ${newW} × ${newH}px at 300 DPI.` });
    } catch (err: any) {
      toast({ title: 'Upscale failed', description: err.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setIsUpscaling(false);
    }
  };

  const rotateSelectedItems = (delta: 90 | -90) => {
    if (selectedCanvasItems.size === 0) return;
    
    // When collision detection is enabled, check if rotation would cause overlaps
    if (enableCollisionDetection) {
      // Calculate rotated positions for all selected items
      const rotatedSelectedItems = Array.from(selectedCanvasItems).map(id => {
        const item = canvasItems.find(i => i.id === id)!;
        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        return {
          id: item.id,
          x: cx - item.height / 2,
          y: cy - item.width / 2,
          width: item.height,
          height: item.width,
        };
      });
      
      // Check collision with non-selected items
      const collidesWithOthers = rotatedSelectedItems.some(rotated => {
        return canvasItems.some(other => {
          if (other.id === rotated.id) return false;
          if (selectedCanvasItems.has(other.id)) return false; // skip other selected items for now
          return aabbOverlap(rotated.x, rotated.y, rotated.width, rotated.height, other.x, other.y, other.width, other.height);
        });
      });
      
      // Check collision between selected items
      const collidesWithEachOther = rotatedSelectedItems.some((item1, i) => {
        return rotatedSelectedItems.some((item2, j) => {
          if (i >= j) return false;
          return aabbOverlap(item1.x, item1.y, item1.width, item1.height, item2.x, item2.y, item2.width, item2.height);
        });
      });
      
      if (collidesWithOthers || collidesWithEachOther) {
        toast({ title: 'Cannot rotate', description: 'Rotation would overlap with another item.' });
        return;
      }
    }
    
    updateActiveSheet(prev => prev.map(item => {
      if (!selectedCanvasItems.has(item.id)) return item;
      const rot = ((item.rotation ?? 0) + delta + 360) % 360;
      // Swap width/height and re-center so the item stays in the same position
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      return {
        ...item,
        rotation: rot,
        width: item.height,
        height: item.width,
        x: cx - item.height / 2,
        y: cy - item.width / 2,
      };
    }));
  };

  // Update selected item size via panel inputs
  const applyDimensionEdit = () => {
    if (!selectedItem) return;
    const p3 = (v: number) => Math.round(v * 1000) / 1000;
    const newW = Math.max(10, p3(in2px(editW)));
    const newH = lockAspectRatio
      ? p3(newW * (selectedItem.height / selectedItem.width))
      : Math.max(10, p3(in2px(editH)));
    updateActiveSheet(prev => prev.map(i =>
      i.id === selectedItem.id ? { ...i, width: newW, height: newH } : i
    ));
  };

  const applyPositionEdit = () => {
    if (!selectedItem) return;
    const p3 = (v: number) => Math.round(v * 1000) / 1000;
    const newX = Math.max(0, p3(in2px(editX)));
    const newY = Math.max(0, p3(in2px(editY)));
    updateActiveSheet(prev => prev.map(i =>
      i.id === selectedItem.id ? { ...i, x: newX, y: newY } : i
    ));
  };

  // DPI calculation
  // After a 90°/270° rotation the canvas width maps to the image's natural height
  // direction, so we must use naturalH instead of naturalW to keep DPI stable.
  const getDPI = (item: CanvasItem) => {
    const rot = item.rotation ?? 0;
    const is90or270 = rot === 90 || rot === 270;
    // When rotated 90/270 the item's width/height are already swapped by rotateSelectedItems,
    // so we must also swap which natural dimension maps to which axis.
    const natW = is90or270 ? item.naturalH : item.naturalW;
    const natH = is90or270 ? item.naturalW : item.naturalH;
    const widthIn  = item.width  / PX_PER_INCH;
    const heightIn = item.height / PX_PER_INCH;
    // Use the minimum DPI across both axes — rotation-invariant and shows the limiting dimension.
    return Math.round(Math.min(natW / widthIn, natH / heightIn));
  };

  const getDPILabel = (dpi: number) => {
    if (dpi >= 300) return { label: 'GOOD', color: '#00CED1' };
    if (dpi >= 200) return { label: 'OK', color: '#FFE600' };
    return { label: 'LOW', color: '#FF1493' };
  };

  // Auto-arrange (bin-packing) — GAP is the inter-image spacing, no edge padding.
  // Uses a skyline algorithm: tracks the current top-edge profile of placed items so that
  // the space beside a tall image is filled by shorter images rather than left empty.
  // After packing, each row is centered horizontally.
  const packSheet = useCallback((items: CanvasItem[], sheetH: number) => {
    const GAP = Math.max(MIN_GAP_PX, enableGap ? Math.round(gapIn * PX_PER_INCH) : 0);
    if (!items.length) return { arranged: [], overflow: [] };

    const sorted = [...items].sort((a, b) => (b.width * b.height) - (a.width * a.height));

    // Skyline: sorted list of {x, y} step-change points.
    // The height from sky[i].x to sky[i+1].x (or CANVAS_BASE_WIDTH) is sky[i].y.
    type Seg = { x: number; y: number };
    let sky: Seg[] = [{ x: 0, y: 0 }];

    // Return the skyline height at a given x.
    const skyAt = (x: number): number => {
      let h = 0;
      for (const s of sky) { if (s.x <= x) h = s.y; else break; }
      return h;
    };

    // Return the maximum skyline height within [x1, x2).
    const skyMax = (x1: number, x2: number): number => {
      let max = 0;
      for (let i = 0; i < sky.length; i++) {
        const segStart = sky[i].x;
        const segEnd = i + 1 < sky.length ? sky[i + 1].x : CANVAS_BASE_WIDTH;
        if (segStart < x2 && segEnd > x1) max = Math.max(max, sky[i].y);
      }
      return max;
    };

    // Raise the skyline in [x1, x1+w) to newY and merge adjacent equal segments.
    const skyRaise = (x1: number, w: number, newY: number) => {
      const x2 = Math.min(x1 + w, CANVAS_BASE_WIDTH);
      const yAfter = skyAt(x2);
      const next: Seg[] = [];
      for (const s of sky) { if (s.x < x1) next.push(s); }
      const prevY = next.length ? next[next.length - 1].y : 0;
      if (prevY !== newY) next.push({ x: x1, y: newY });
      if (x2 < CANVAS_BASE_WIDTH && yAfter !== newY) next.push({ x: x2, y: yAfter });
      for (const s of sky) { if (s.x > x2) next.push(s); }
      // Merge consecutive segments with the same y
      const merged: Seg[] = [];
      for (const s of next) {
        if (merged.length && merged[merged.length - 1].y === s.y) continue;
        merged.push(s);
      }
      sky = merged.length ? merged : [{ x: 0, y: 0 }];
    };

    const placed: CanvasItem[] = [];
    const overflow: CanvasItem[] = [];

    for (const item of sorted) {
      const iw = Math.min(item.width, CANVAS_BASE_WIDTH);
      const ih = item.height;

      // Candidate starting x positions: 0 and every skyline step point that leaves room.
      const cands = [...new Set([0, ...sky.map(s => s.x)])].filter(x => x + iw <= CANVAS_BASE_WIDTH);

      let bestX = -1, bestY = Infinity;
      for (const x of cands) {
        const y = skyMax(x, x + iw);
        if (y + ih <= sheetH && (y < bestY || (y === bestY && x < bestX))) {
          bestY = y; bestX = x;
        }
      }

      if (bestX < 0) { overflow.push(item); continue; }

      placed.push({ ...item, x: bestX, y: bestY, width: iw, height: ih });
      // Reserve iw + GAP horizontally and ih + GAP vertically in the skyline.
      skyRaise(bestX, iw + GAP, bestY + ih + GAP);
    }

    // Center the entire packed layout as one unit.
    // Per-row centering scatters items when rows have different widths (e.g. one large item
    // beside small items), so we shift the whole block once instead.
    if (!placed.length) return { arranged: [], overflow };
    const minX = Math.min(...placed.map(i => i.x));
    const maxX = Math.max(...placed.map(i => i.x + i.width));
    const blockW = maxX - minX;
    const blockOffset = Math.round((CANVAS_BASE_WIDTH - blockW) / 2) - minX;
    const arranged = placed.map(i => ({ ...i, x: i.x + blockOffset }));

    return { arranged, overflow };
  }, [gapIn, enableGap]);

  const packAllSheets = useCallback((items: CanvasItem[], sheetH: number): CanvasItem[][] => {
    if (!items.length) return [];
    const { arranged, overflow } = packSheet(items, sheetH);
    const result: CanvasItem[][] = [arranged];
    if (overflow.length > 0 && overflow.length < items.length) result.push(...packAllSheets(overflow, sheetH));
    return result;
  }, [packSheet]);


  // Project fetch/save/load
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch(apiUrl('/projects'), { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json() as { projects: SavedProject[] };
      setProjects(data.projects.reverse());
    } catch {
      // ignore
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const fetchLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetch(apiUrl('/library'), { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json() as { images: Array<{
        id: number; name: string; objectPath: string;
        naturalW: number; naturalH: number; fileDpi: number;
        docWidthIn: number | null; docHeightIn: number | null;
      }> };
      setLibraryImages(data.images.map(img => ({
        id: `lib-${img.id}`,
        libraryId: img.id,
        url: apiUrl(`/storage/objects${img.objectPath.replace(/^\/objects/, '')}`),
        objectPath: img.objectPath,
        name: img.name,
        naturalW: img.naturalW,
        naturalH: img.naturalH,
        fileDPI: img.fileDpi,
        docWidthIn: img.docWidthIn ?? undefined,
        docHeightIn: img.docHeightIn ?? undefined,
      })));
    } catch {
      // ignore
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const res = await fetch(apiUrl('/orders'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load orders');
      const { orders } = await res.json() as { orders: GangSheetOrder[] };
      setGangSheetOrders(orders);
    } catch {
      setOrdersError('Could not load your orders.');
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  const deleteFromLibrary = useCallback(async (item: LibraryItem) => {
    if (!item.libraryId) return;
    try {
      await fetch(apiUrl(`/library/${item.libraryId}`), { method: 'DELETE', credentials: 'include' });

      // 1. Remove from the global library panel
      setLibraryImages(prev => prev.filter(i => i.id !== item.id));

      // 2. Remove from the current project's image list and canvas
      setLibrary(prev => {
        const removedIds = new Set(
          prev.filter(img => img.objectPath === item.objectPath).map(img => img.id)
        );
        if (removedIds.size === 0) return prev;
        // Strip canvas items that reference the removed image(s)
        setSheets(sh => sh.map(sheet => sheet.filter(ci => !removedIds.has(ci.imageId))));
        return prev.filter(img => !removedIds.has(img.id));
      });
    } catch {
      toast({ title: 'Delete failed', description: 'Could not remove image from library.', variant: 'destructive' });
    }
  }, [toast]);

  // ── Draft: load once after auth resolves (only when starting fresh, no named project) ──
  useEffect(() => {
    if (auth.isLoading) return;           // wait for auth check to finish
    if (draftLoadedRef.current) return;   // already loaded once this session
    if (projectId !== null) return;       // a named project is active — skip
    draftLoadedRef.current = true;

    const applyDraft = (lib: UploadedImage[], sh: CanvasItem[][], sn: string[]) => {
      if (lib.length === 0 && !sh.some(s => s.length > 0)) return;
      setLibrary(lib);
      setSheets(sh);
      setSheetNames(sn);
      setHistory([sh]);
      setHistoryIndex(0);
    };

    void (async () => {
      if (auth.isLoggedIn) {
        // ── Restore the last active named project across refreshes ──
        const saved = loadActiveProjectFromLS();
        if (saved) {
          try {
            const res = await fetch(apiUrl(`/projects/${saved.id}`), { credentials: 'include' });
            if (res.ok) {
              const result = await res.json() as { project: { id: number; name: string; data: { library: UploadedImage[]; sheets: CanvasItem[][]; sheetNames: string[] } } };
              const { library: lib, sheets: sh, sheetNames: sn } = result.project.data;
              setLibrary(lib ?? []);
              setSheets(sh ?? [[[]]]);
              setSheetNames(sn ?? ['Sheet 1']);
              setActiveSheetIndex(0);
              setProjectId(result.project.id);
              setProjectName(result.project.name);
              setHistory([sh ?? [[]]]);
              setHistoryIndex(0);
              // Mark load complete AFTER all state setters — batched with them in React 18
              setDraftLoadComplete(true);
              return; // named project restored — skip draft
            }
          } catch { /* project may have been deleted — fall through */ }
          clearActiveProjectFromLS();
        }

        // ── Prefer whichever of DB draft / localStorage is newer ──
        try {
          const res = await fetch(apiUrl('/projects/draft'), { credentials: 'include' });
          if (res.ok) {
            const { project } = await res.json() as { project: { updatedAt: string; data: { library: UploadedImage[]; sheets: CanvasItem[][]; sheetNames: string[] } } | null };
            if (project) {
              const dbTs = new Date(project.updatedAt).getTime();
              const ls = loadDraftFromLS();
              if (ls && ls.savedAt > dbTs) {
                applyDraft(ls.library, ls.sheets, ls.sheetNames);
              } else {
                const { library: lib, sheets: sh, sheetNames: sn } = project.data;
                applyDraft(lib ?? [], sh ?? [[]], sn ?? ['Sheet 1']);
              }
              setDraftLoadComplete(true);
              return;
            }
          }
        } catch { /* fall through */ }
      }

      // Fall back to localStorage (same device, survives refresh)
      const ls = loadDraftFromLS();
      if (ls) {
        applyDraft(ls.library, ls.sheets, ls.sheetNames);
      }
      setDraftLoadComplete(true);
    })();
  }, [auth.isLoading, auth.isLoggedIn, projectId]);

  // ── Draft: auto-save whenever library/sheets change (only while in "unsaved" mode) ──
  useEffect(() => {
    if (projectId !== null) return; // named project is active — don't overwrite draft
    // Use draftLoadComplete STATE (not the ref) so this effect only runs after the
    // async load has fully committed all state — prevents spurious draft creation on startup.
    if (!draftLoadComplete) return;

    // When canvas is empty, clear the draft entirely instead of keeping a stale copy
    if (library.length === 0 && !sheets.some(s => s.length > 0)) {
      clearDraftFromLS();
      // Also wipe the DB draft so a stale server copy can't resurrect on refresh
      if (auth.isLoggedIn) {
        void fetch(apiUrl('/projects/draft'), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ library: [], sheets: [[]], sheetNames: ['Sheet 1'] }),
        }).catch(() => { /* best-effort */ });
      }
      return;
    }

    const payload: DraftPayload = { library, sheets, sheetNames, savedAt: Date.now() };

    // Save to localStorage immediately (instant, local)
    saveDraftToLS(payload);

    // Debounce DB save (2 seconds after last change)
    if (!auth.isLoggedIn) return;
    const timer = setTimeout(() => {
      void fetch(apiUrl('/projects/draft'), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library, sheets, sheetNames }),
      }).catch(() => { /* silent — draft DB save is best-effort */ });
    }, 2000);
    return () => clearTimeout(timer);
  }, [library, sheets, sheetNames, projectId, auth.isLoggedIn, draftLoadComplete]);

  // Persist autoSave preference and interval
  useEffect(() => {
    try { localStorage.setItem('rp_autosave', autoSave ? 'true' : 'false'); } catch { /* ignore */ }
  }, [autoSave]);
  useEffect(() => {
    try { localStorage.setItem('rp_autosave_interval', String(autoSaveIntervalSec)); } catch { /* ignore */ }
  }, [autoSaveIntervalSec]);

  // Persist canvas-behaviour toggles so they survive page refresh
  useEffect(() => {
    try { localStorage.setItem('rp_enable_gap', enableGap ? 'true' : 'false'); } catch { /* ignore */ }
  }, [enableGap]);
  useEffect(() => {
    try { localStorage.setItem('rp_gap_in', String(gapIn)); } catch { /* ignore */ }
  }, [gapIn]);
  useEffect(() => {
    try { localStorage.setItem('rp_enable_collision', enableCollisionDetection ? 'true' : 'false'); } catch { /* ignore */ }
  }, [enableCollisionDetection]);

  // ── Auto-save named project: immediate when an image is added OR canvas becomes empty ──
  useEffect(() => {
    // When the active project changes, reset the baseline so loading a project
    // doesn't look like "images were added" and trigger a spurious save.
    if (prevProjectIdRef.current !== projectId) {
      prevProjectIdRef.current = projectId;
      prevLibraryLenRef.current = library.length;
      return;
    }
    const prev = prevLibraryLenRef.current;
    prevLibraryLenRef.current = library.length;
    if (!draftLoadComplete) return;
    if (!autoSave) return;
    if (projectId === null || !projectName) return;
    if (!auth.isLoggedIn) return;
    const imageAdded = library.length > prev;
    const canvasNowEmpty = library.length === 0 && !sheets.some(s => s.length > 0);
    if (!imageAdded && !canvasNowEmpty) return; // no immediate trigger
    void (async () => {
      setIsAutoSaving(true);
      try {
        await Promise.all([
          fetch(apiUrl(`/projects/${projectId}`), {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName, data: { library, sheets, sheetNames } }),
          }),
          new Promise(resolve => setTimeout(resolve, 1500)),
        ]);
      } catch { /* silent */ } finally {
        setIsAutoSaving(false);
      }
    })();
  }, [library, sheets, autoSave, projectId, projectName, auth.isLoggedIn, sheetNames, draftLoadComplete]);

  // ── Auto-save named project: periodic debounce (user-configurable interval) ──
  useEffect(() => {
    if (!autoSave) return;
    if (projectId === null || !projectName) return;
    if (!auth.isLoggedIn) return;
    if (!draftLoadedRef.current) return;
    const timer = setTimeout(() => {
      void (async () => {
        setIsAutoSaving(true);
        try {
          await Promise.all([
            fetch(apiUrl(`/projects/${projectId}`), {
              method: 'PUT',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: projectName, data: { library, sheets, sheetNames } }),
            }),
            new Promise(resolve => setTimeout(resolve, 1500)),
          ]);
        } catch { /* silent */ } finally {
          setIsAutoSaving(false);
        }
      })();
    }, autoSaveIntervalSec * 1000);
    return () => clearTimeout(timer);
  }, [autoSave, autoSaveIntervalSec, projectId, projectName, library, sheets, sheetNames, auth.isLoggedIn]);

  // Re-check session when switching to orders tab
  useEffect(() => {
    if (leftPanel === 'orders' && !auth.isLoading) {
      void checkSession();
    }
  }, [leftPanel, checkSession, auth.isLoading]);

  // Re-check session when switching to projects tab
  useEffect(() => {
    if (leftPanel === 'projects' && !auth.isLoading) {
      void checkSession();
    }
  }, [leftPanel, checkSession, auth.isLoading]);

  const handleSaveClick = useCallback(() => {
    if (!auth.isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    if (projectId && projectName) {
      // Auto-save to existing project
      void (async () => {
        setIsSaving(true);
        try {
          const data = { library, sheets, sheetNames };
          const res = await fetch(apiUrl(`/projects/${projectId}`), {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName, data }),
          });
          if (!res.ok) throw new Error('Failed to save');
          toast({ title: 'Project saved!', description: `"${projectName}" has been updated.` });
        } catch {
          toast({ title: 'Save failed', description: 'Could not save your project. Please try again.' });
        } finally {
          setIsSaving(false);
        }
      })();
    } else {
      setSaveDialogName(projectName || 'My Gang Sheet');
      setShowSaveDialog(true);
    }
  }, [auth.isLoggedIn, projectId, projectName, library, sheets, sheetNames, toast]);

  const handleSaveConfirm = useCallback(async () => {
    if (!saveDialogName.trim()) return;
    setIsSaving(true);
    setShowSaveDialog(false);
    try {
      const data = { library, sheets, sheetNames };
      if (projectId) {
        const res = await fetch(apiUrl(`/projects/${projectId}`), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: saveDialogName.trim(), data }),
        });
        if (!res.ok) throw new Error('Failed to save');
        setProjectName(saveDialogName.trim());
        toast({ title: 'Project saved!', description: `"${saveDialogName.trim()}" has been updated.` });
      } else {
        const res = await fetch(apiUrl('/projects'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: saveDialogName.trim(), data }),
        });
        if (!res.ok) throw new Error('Failed to save');
        const result = await res.json() as { project: { id: number; name: string } };
        setProjectId(result.project.id);
        setProjectName(result.project.name);
        // Draft is now promoted to a named project — clear localStorage copy and persist the active project
        clearDraftFromLS();
        saveActiveProjectToLS({ id: result.project.id, name: result.project.name });
        toast({ title: 'Project saved!', description: `"${result.project.name}" has been saved to your account.` });
      }
    } catch {
      toast({ title: 'Save failed', description: 'Could not save your project. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [saveDialogName, projectId, library, sheets, sheetNames, toast]);

  const handleRenameProjectCommit = useCallback(async () => {
    const newName = projectRenameValue.trim();
    setRenameProjectModalOpen(false);
    if (!newName || !renameTargetProjectId) return;
    try {
      const res = await fetch(apiUrl(`/projects/${renameTargetProjectId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      if (renameTargetProjectId === projectId) setProjectName(newName);
      setProjects(prev => prev.map(p => p.id === renameTargetProjectId ? { ...p, name: newName } : p));
      toast({ title: 'Project renamed', description: `Renamed to "${newName}".` });
    } catch {
      toast({ title: 'Rename failed', description: 'Could not rename the project. Please try again.' });
    }
  }, [projectRenameValue, renameTargetProjectId, projectId, toast]);

  const handleLoadProject = useCallback(async (proj: SavedProject) => {
    try {
      const res = await fetch(apiUrl(`/projects/${proj.id}`), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const result = await res.json() as { project: { id: number; name: string; data: { library: UploadedImage[]; sheets: CanvasItem[][]; sheetNames: string[] } } };
      const { library: lib, sheets: sh, sheetNames: sn } = result.project.data;
      setLibrary(lib ?? []);
      setSheets(sh ?? [[[]]]);
      setSheetNames(sn ?? ['Sheet 1']);
      setActiveSheetIndex(0);
      setProjectId(result.project.id);
      setProjectName(result.project.name);
      setHistory([sh ?? [[]]]);
      setHistoryIndex(0);
      setLeftPanel('images');
      saveActiveProjectToLS({ id: result.project.id, name: result.project.name });
      toast({ title: 'Project loaded!', description: `"${result.project.name}" has been loaded.` });
    } catch {
      toast({ title: 'Load failed', description: 'Could not load this project. Please try again.' });
    }
  }, [toast]);

  const handleDeleteProject = useCallback((proj: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteProject(proj);
  }, []);

  const handleDeleteProjectConfirm = useCallback(async () => {
    const proj = confirmDeleteProject;
    setConfirmDeleteProject(null);
    if (!proj) return;
    try {
      const res = await fetch(apiUrl(`/projects/${proj.id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProjects(prev => prev.filter(p => p.id !== proj.id));
      if (projectId === proj.id) {
        setProjectId(null);
        setProjectName('');
        setLibrary([]);
        setSheets([[]]);
        setSheetNames(['Sheet 1']);
        setActiveSheetIndex(0);
        setHistory([[[ ]]]);
        setHistoryIndex(0);
        setSelectedCanvasItems(new Set());
        clearActiveProjectFromLS();
      }
      toast({ title: 'Project deleted', description: `"${proj.name}" has been deleted.` });
    } catch {
      toast({ title: 'Delete failed', description: 'Could not delete this project.' });
    }
  }, [confirmDeleteProject, projectId, toast]);

  // Upload — uploads to object storage for persistence
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(async (file) => {
      const blobUrl = URL.createObjectURL(file);
      const { dpi: fileDPI, docWidthIn, docHeightIn } = await readPngMeta(file);
      const img = new Image();
      img.onload = async () => {
        const tempId = genId();
        // Add to library immediately with blob URL so the user sees it right away
        setLibrary(prev => [...prev, {
          id: tempId, url: blobUrl, name: file.name,
          naturalW: img.naturalWidth, naturalH: img.naturalHeight,
          fileDPI, docWidthIn, docHeightIn,
          uploading: true,
        }]);

        try {
          // Upload to object storage for a persistent URL
          const metaRes = await fetch(apiUrl('/storage/uploads/request-url'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || 'application/octet-stream' }),
          });
          if (!metaRes.ok) throw new Error('Failed to get upload URL');
          const { uploadURL, objectPath } = await metaRes.json() as { uploadURL: string; objectPath: string };

          await fetch(uploadURL, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });

          // Build stable serving URL from objectPath (/objects/uploads/uuid → /api/storage/objects/uploads/uuid)
          const stableUrl = apiUrl(`/storage/objects${objectPath.slice('/objects'.length)}`);

          setLibrary(prev => prev.map(item =>
            item.id === tempId ? { ...item, url: stableUrl, objectPath, uploading: false } : item
          ));
          // Update any canvas items that reference this library image
          setSheets(prev => prev.map(sheet => sheet.map(ci =>
            ci.imageId === tempId ? { ...ci, url: stableUrl } : ci
          )));
          // Also auto-save to the persistent library (fire-and-forget)
          if (auth.isLoggedIn) {
            fetch(apiUrl('/library'), {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: file.name, objectPath,
                naturalW: img.naturalWidth, naturalH: img.naturalHeight,
                fileDpi: fileDPI, docWidthIn, docHeightIn,
              }),
            }).then(r => r.ok ? r.json() : null).then((data: { image?: { id: number } } | null) => {
              if (data?.image) {
                setLibraryImages(prev => {
                  if (prev.some(i => i.objectPath === objectPath)) return prev;
                  return [{
                    id: `lib-${data.image!.id}`, libraryId: data.image!.id,
                    url: stableUrl, objectPath, name: file.name,
                    naturalW: img.naturalWidth, naturalH: img.naturalHeight,
                    fileDPI, docWidthIn, docHeightIn,
                  }, ...prev];
                });
              }
            }).catch(() => {/* ignore – library save is best-effort */});
          }
        } catch {
          // If upload fails, keep the blob URL (it'll work for this session)
          setLibrary(prev => prev.map(item =>
            item.id === tempId ? { ...item, uploading: false } : item
          ));
        }
      };
      img.src = blobUrl;
    });
  }, [auth.isLoggedIn]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/svg+xml': ['.svg'], 'application/pdf': ['.pdf'] },
    noClick: false,
  });

  const addToCanvas = (img: UploadedImage) => {
    const GAP = Math.max(MIN_GAP_PX, enableGap ? Math.round(gapIn * PX_PER_INCH) : 0);
    const MAX_HEIGHT_PX = Math.round(MAX_HEIGHT_IN * PX_PER_INCH);

    // Use XMP document dimensions if embedded (Photoshop saves these),
    // otherwise fall back to pixel dimensions ÷ pHYs DPI (or 300 default).
    // Keep 3 decimal places of canvas-pixel precision to avoid inch-display rounding errors.
    const px3 = (v: number) => Math.round(v * 1000) / 1000;
    const PRINT_DPI = img.fileDPI || 300;
    let w: number;
    let h: number;
    if (img.docWidthIn && img.docHeightIn) {
      w = px3(img.docWidthIn * PX_PER_INCH);
      h = px3(img.docHeightIn * PX_PER_INCH);
    } else {
      w = px3((img.naturalW / PRINT_DPI) * PX_PER_INCH);
      h = px3((img.naturalH / PRINT_DPI) * PX_PER_INCH);
    }
    // If the image is wider than the canvas, scale it down proportionally
    if (w > CANVAS_BASE_WIDTH) {
      const scale = CANVAS_BASE_WIDTH / w;
      w = CANVAS_BASE_WIDTH;
      h = px3(h * scale);
    }

    const findNextPosition = (sheetItems: CanvasItem[]): { x: number; y: number } => {
      if (sheetItems.length === 0) return { x: 0, y: 0 };

      // Find the row with the largest y-start (the "last row")
      const maxY = Math.max(...sheetItems.map(i => i.y));
      const lastRowItems = sheetItems.filter(i => Math.abs(i.y - maxY) <= 10);
      const lastRowRight = Math.max(...lastRowItems.map(i => i.x + i.width));

      // Try placing to the right of the last item in the row
      if (lastRowRight + GAP + w <= CANVAS_BASE_WIDTH) {
        return { x: lastRowRight + GAP, y: maxY };
      }

      // Start a new row below all items
      const allBottom = Math.max(...sheetItems.map(i => i.y + i.height));
      return { x: 0, y: allBottom + GAP };
    };

    let targetSheetIdx = sheets.length - 1;
    let sheetItems = sheets[targetSheetIdx] ?? [];
    let { x, y } = findNextPosition(sheetItems);

    // If image would exceed the max sheet height, start a new sheet
    if (y + h > MAX_HEIGHT_PX) {
      targetSheetIdx = sheets.length;
      sheetItems = [];
      x = 0;
      y = 0;
      const nextSheetNum = getNextSheetNumber();
      setSheetNames(prev => [...prev, `Sheet ${nextSheetNum}`]);
    }

    const newItem: CanvasItem = {
      id: genId(), imageId: img.id, url: img.url, name: img.name,
      x, y, width: w, height: h,
      naturalW: img.naturalW, naturalH: img.naturalH, fileDPI: PRINT_DPI,
    };

    setSheets(prev => {
      const next = prev.map(s => [...s]);
      if (targetSheetIdx >= next.length) {
        next.push([newItem]);
      } else {
        next[targetSheetIdx] = [...next[targetSheetIdx], newItem];
      }
      return next;
    });

    setActiveSheetIndex(targetSheetIdx);
  };

  const removeFromSessionImages = (imgId: string) => {
    setLibrary(prev => prev.filter(i => i.id !== imgId));
  };

  const getImageCount = (imgId: string) => sheets.flat().filter(i => i.imageId === imgId).length;

  // Cart
  const nonEmptySheets = sheets.filter(s => s.length > 0);
  const sheetPrice = Math.round(canvasHeightIn * PRICE_PER_INCH * 100) / 100;
  // Sum each sheet's individual price based on its own content height
  const totalPrice = (() => {
    if (nonEmptySheets.length === 0) return sheetPrice;
    return sheets.reduce((sum, sheetItems) => {
      if (sheetItems.length === 0) return sum;
      const maxBottomPx = sheetItems.reduce((m, item) => Math.max(m, item.y + item.height), 0);
      const heightIn = Math.min(MAX_HEIGHT_IN, Math.max(12, Math.round(maxBottomPx / PX_PER_INCH)));
      return sum + Math.round(heightIn * PRICE_PER_INCH * 100) / 100;
    }, 0);
  })();

  const handleAddToCart = async () => {
    if (!nonEmptySheets.length) {
      toast({ title: 'Whoa there!', description: 'Your gang sheet is empty.', variant: 'destructive' });
      return;
    }

    setIsAddingToCart(true);
    setCartAddProgress({ stage: 'saving', tilesCurrent: 0, tilesTotal: 0 });

    try {
      // ── Stage 1: Auto-save project + create order snapshot ──────────────
      let savedProjectId = projectId;
      let orderRecordId: number | null = null;

      if (auth.isLoggedIn) {
        // Auto-save to a named project if the sheet has never been saved
        if (!savedProjectId) {
          try {
            const listRes = await fetch(apiUrl('/projects'), { credentials: 'include' });
            const { projects: existing } = listRes.ok
              ? (await listRes.json() as { projects: Array<{ name: string }> })
              : { projects: [] };
            const existingNames = new Set(existing.map(p => p.name));
            let autoName = 'Untitled Project';
            let seq = 2;
            while (existingNames.has(autoName)) autoName = `Untitled Project ${seq++}`;

            const saveRes = await fetch(apiUrl('/projects'), {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: autoName, data: { library, sheets, sheetNames } }),
            });
            if (saveRes.ok) {
              const { project } = await saveRes.json() as { project: { id: number; name: string } };
              savedProjectId = project.id;
              setProjectId(project.id);
              setProjectName(project.name);
              clearDraftFromLS();
              saveActiveProjectToLS({ id: project.id, name: project.name });
            }
          } catch { /* non-fatal */ }
        }

        // Create the order snapshot (once)
        try {
          const res = await fetch(apiUrl('/orders'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectSnapshot: { library, sheets, sheetNames },
              projectId: savedProjectId ?? undefined,
              canvasWidthIn: CANVAS_WIDTH_IN,
              canvasHeightIn: canvasHeightIn,
              totalPrice: totalPrice,
            }),
          });
          if (res.ok) {
            const { order } = await res.json();
            orderRecordId = order.id;
          }
        } catch { /* non-fatal */ }
      }

      // ── Stage 2 & 3: Look up variant + render + upload print file ────────
      const variantId = await fetchGangSheetVariantId();

      let printFileUrl: string | undefined;
      try {
        if (canvasItems.length > 0) {
          const EXPORT_DPI_LOCAL = 300;
          const scaleLocal = EXPORT_DPI_LOCAL / PX_PER_INCH_BASE;
          const exportWLocal = Math.round(CANVAS_WIDTH_IN * EXPORT_DPI_LOCAL);
          const numTilesLocal = Math.ceil(canvasHeightIn / EXPORT_MAX_TILE_IN);

          setCartAddProgress({ stage: 'rendering', tilesCurrent: 0, tilesTotal: numTilesLocal });

          type DrawSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
          const stepDownLocal = (src: DrawSource, tw: number, th: number): DrawSource => {
            const sw = src instanceof HTMLImageElement ? src.naturalWidth  : src.width;
            const sh = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
            if (sw / tw <= 2 && sh / th <= 2) return src;
            let cur: DrawSource = src; let cw = sw; let ch = sh;
            while (cw / tw > 2 || ch / th > 2) {
              const nw = Math.max(Math.round(cw / 2), tw);
              const nh = Math.max(Math.round(ch / 2), th);
              const step = document.createElement('canvas');
              step.width = nw; step.height = nh;
              const sctx = step.getContext('2d')!;
              sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
              sctx.drawImage(cur, 0, 0, nw, nh);
              if (cur instanceof ImageBitmap) cur.close();
              cur = step; cw = nw; ch = nh;
            }
            return cur;
          };

          const renderTileLocal = async (topIn: number, bottomIn: number): Promise<HTMLCanvasElement> => {
            const heightPx = Math.round((bottomIn - topIn) * EXPORT_DPI_LOCAL);
            const topCanvas = topIn * PX_PER_INCH_BASE;
            const bottomCanvas = bottomIn * PX_PER_INCH_BASE;
            const offsetPx = topIn * EXPORT_DPI_LOCAL;
            const tile = document.createElement('canvas');
            tile.width = exportWLocal; tile.height = heightPx;
            const ctx = tile.getContext('2d', { alpha: true })!;
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
            for (const item of canvasItems) {
              if (item.y + item.height < topCanvas || item.y > bottomCanvas) continue;
              try {
                const blob = await fetch(item.url).then(r => r.blob());
                const bitmap = await createImageBitmap(blob);
                const rot = item.rotation ?? 0;
                const is90 = rot === 90 || rot === 270;
                const dw = Math.round((is90 ? item.height : item.width) * scaleLocal);
                const dh = Math.round((is90 ? item.width  : item.height) * scaleLocal);
                const cx = Math.round((item.x + item.width  / 2) * scaleLocal);
                const cy = Math.round((item.y + item.height / 2) * scaleLocal - offsetPx);
                const source = stepDownLocal(bitmap, dw, dh);
                ctx.save();
                ctx.translate(cx, cy);
                if (rot) ctx.rotate((rot * Math.PI) / 180);
                if (item.flipH) ctx.scale(-1, 1);
                if (item.flipV) ctx.scale(1, -1);
                ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
                ctx.restore();
                if (source instanceof ImageBitmap) source.close();
              } catch { /* skip failed images */ }
            }
            return tile;
          };

          const formData = new FormData();
          for (let t = 0; t < numTilesLocal; t++) {
            const topIn    = t * EXPORT_MAX_TILE_IN;
            const bottomIn = Math.min((t + 1) * EXPORT_MAX_TILE_IN, canvasHeightIn);
            const tile = await renderTileLocal(topIn, bottomIn);
            const blob = await new Promise<Blob>((resolve, reject) => {
              tile.toBlob(b => b ? resolve(b) : reject(new Error('Tile render returned null')), 'image/png');
            });
            formData.append('tiles', blob, `tile_${t}.png`);
            setCartAddProgress({ stage: 'rendering', tilesCurrent: t + 1, tilesTotal: numTilesLocal });
          }
          if (orderRecordId) formData.append('orderRecordId', String(orderRecordId));

          setCartAddProgress({ stage: 'uploading', tilesCurrent: numTilesLocal, tilesTotal: numTilesLocal });

          const pfRes = await fetch(apiUrl('/print-files'), {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          if (pfRes.ok) {
            const { objectPath } = await pfRes.json();
            printFileUrl = `${window.location.origin}${apiUrl(`/storage/objects${objectPath.replace(/^\/objects/, '')}`)}`;
          }
        }
      } catch (err) {
        console.warn('[handleAddToCart] print file render/upload failed:', err);
      }

      // ── Stage 4: Build attributes and add to Shopify cart ───────────────
      setCartAddProgress(p => p ? { ...p, stage: 'adding' } : null);

      const lengthFt = (canvasHeightIn / 12).toFixed(2);
      const printSizeStr = `${CANVAS_WIDTH_IN}" × ${canvasHeightIn.toFixed(2)}" (${lengthFt} ft)`;
      const editorUrl = `${window.location.origin}${import.meta.env.BASE_URL}builder${savedProjectId ? `?project=${savedProjectId}` : ''}`;
      const totalImageQty = nonEmptySheets.reduce((sum, s) => sum + s.length, 0);

      const extraAttributes: Array<{ key: string; value: string }> = [
        { key: 'print_size',   value: printSizeStr },
        { key: 'length',       value: `${lengthFt} ft` },
        { key: 'sheet_count',  value: String(nonEmptySheets.length) },
        { key: 'image_qty',    value: String(totalImageQty) },
        { key: 'sheet_editor', value: editorUrl },
      ];
      if (printFileUrl)  extraAttributes.push({ key: 'print_file',     value: printFileUrl });
      if (orderRecordId) extraAttributes.push({ key: '_orderRecordId', value: String(orderRecordId) });

      for (const sheetItems of sheets) {
        if (!sheetItems.length) continue;
        await addItem({
          name:     'Created Gang Sheet',
          type:     'custom-sheet',
          size:     `${CANVAS_WIDTH_IN}" × ${canvasHeightIn.toFixed(2)}"`,
          price:    sheetPrice,
          quantity: 1,
          image:    printFileUrl ?? sheetItems[0]?.url,
          variantId,
          extraAttributes,
        });
      }

      setSheets([[]]); setActiveSheetIndex(0); setSheetNames(['Sheet 1']);

      // Navigate the customer to the cart page
      navigate('/cart');
    } finally {
      setIsAddingToCart(false);
      setCartAddProgress(null);
    }
  };

  const filteredLibrary = searchQuery
    ? library.filter(img => img.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : library;

  // Get the next sheet number by finding the highest existing number
  const getNextSheetNumber = () => {
    let maxNum = 1;
    for (const name of sheetNames) {
      const match = name.match(/Sheet (\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
    return maxNum + 1;
  };

  const addSheet = () => {
    setSheets(prev => [...prev, []]);
    const nextNum = getNextSheetNumber();
    setSheetNames(prev => [...prev, `Sheet ${nextNum}`]);
    setActiveSheetIndex(sheets.length);
  };

  const removeSheet = (idx: number) => {
    if (sheets.length === 1) return;
    setSheets(prev => prev.filter((_, i) => i !== idx));
    setSheetNames(prev => prev.filter((_, i) => i !== idx));
    setActiveSheetIndex(Math.max(0, activeSheetIndex - (idx <= activeSheetIndex ? 1 : 0)));
  };

  const hasSelection = selectedCanvasItems.size > 0;

  // ── Download / Export ─────────────────────────────────────────────────────
  const downloadSheet = useCallback(async (format: 'png' | 'zip' | 'stitch') => {
    setShowDownloadMenu(false);
    if (canvasItems.length === 0) {
      toast({ title: 'Nothing to export', description: 'Add some designs to the sheet first.', variant: 'destructive' });
      return;
    }
    setIsExporting(true);
    const sheetLabel = sheetNames[activeSheetIndex] ?? `sheet-${activeSheetIndex + 1}`;
    const safeName = sheetLabel.replace(/[^a-z0-9_-]/gi, '_');
    try {
      const EXPORT_DPI = 300;
      const scale = EXPORT_DPI / PX_PER_INCH_BASE;
      const exportW = Math.round(CANVAS_WIDTH_IN * EXPORT_DPI);
      const numTiles = Math.ceil(canvasHeightIn / EXPORT_MAX_TILE_IN);

      setExportProgress({ current: 0, total: numTiles });

      // Progressive step-down scaling for high-quality large downscaling.
      // Browsers use bilinear interpolation — a single pass from e.g. 4000px→500px
      // loses significant sharpness. Halving in 2:1 steps (where bilinear is optimal)
      // produces near-Lanczos quality. Only triggers when ratio > 2:1.
      // Accepts HTMLImageElement, HTMLCanvasElement, or ImageBitmap.
      type DrawSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
      const stepDownToSize = (
        source: DrawSource,
        targetW: number,
        targetH: number,
      ): DrawSource => {
        const srcW = source instanceof HTMLImageElement ? source.naturalWidth  : source.width;
        const srcH = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
        if (srcW / targetW <= 2 && srcH / targetH <= 2) return source;
        let cur: DrawSource = source;
        let curW = srcW;
        let curH = srcH;
        while (curW / targetW > 2 || curH / targetH > 2) {
          const nextW = Math.max(Math.round(curW / 2), targetW);
          const nextH = Math.max(Math.round(curH / 2), targetH);
          const step = document.createElement('canvas');
          step.width  = nextW;
          step.height = nextH;
          const stepCtx = step.getContext('2d')!;
          stepCtx.imageSmoothingEnabled = true;
          stepCtx.imageSmoothingQuality = 'high';
          stepCtx.drawImage(cur, 0, 0, nextW, nextH);
          if (cur instanceof ImageBitmap) cur.close();
          cur = step;
          curW = nextW;
          curH = nextH;
        }
        return cur;
      };

      // Renders one vertical slice of the sheet into a fresh HTMLCanvasElement.
      // transparentBg=true → no background fill (PNG export preserves alpha)
      // transparentBg=false → white fill (PDF export expects opaque background)
      //
      // Images are loaded via fetch() → blob → createImageBitmap() rather than
      // new Image() with crossOrigin = 'anonymous'.  This avoids the browser
      // cache-taint problem: when the same URL was previously loaded by a React
      // <img> element (without CORS headers), Chrome serves the cached non-CORS
      // response when crossOrigin='anonymous' is set, silently tainting the canvas
      // and causing toBlob/toDataURL to return null/'data:,'.
      // An ImageBitmap created from a fetched Blob is always origin-clean per spec.
      const renderTile = async (tileTopIn: number, tileBottomIn: number, transparentBg: boolean): Promise<HTMLCanvasElement> => {
        const tileHeightPx = Math.round((tileBottomIn - tileTopIn) * EXPORT_DPI);
        const tileTopCanvas    = tileTopIn    * PX_PER_INCH_BASE;
        const tileBottomCanvas = tileBottomIn * PX_PER_INCH_BASE;
        const tileOffsetPx     = tileTopIn    * EXPORT_DPI;

        const tile = document.createElement('canvas');
        tile.width  = exportW;
        tile.height = tileHeightPx;
        const ctx = tile.getContext('2d', { alpha: true })!;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (!transparentBg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, exportW, tileHeightPx);
        }

        for (const item of canvasItems) {
          if (item.y + item.height < tileTopCanvas || item.y > tileBottomCanvas) continue;
          try {
            const blob   = await fetch(item.url).then(r => r.blob());
            const bitmap = await createImageBitmap(blob);

            const rot = item.rotation ?? 0;
            const is90or270 = rot === 90 || rot === 270;
            const drawW = is90or270 ? item.height : item.width;
            const drawH = is90or270 ? item.width  : item.height;
            const cx = Math.round((item.x + item.width  / 2) * scale);
            const cy = Math.round((item.y + item.height / 2) * scale - tileOffsetPx);
            const dw = Math.round(drawW * scale);
            const dh = Math.round(drawH * scale);

            // Step-down for high-quality downscaling (>2:1 ratio).
            const source = stepDownToSize(bitmap, dw, dh);

            ctx.save();
            ctx.translate(cx, cy);
            if (rot) ctx.rotate((rot * Math.PI) / 180);
            if (item.flipH) ctx.scale(-1, 1);
            if (item.flipV) ctx.scale(1, -1);
            ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();

            if (source instanceof ImageBitmap) source.close();
          } catch {
            // Image failed to fetch or decode — skip this item.
          }
        }
        return tile;
      };

      // Helper: download a canvas as a PNG file with correct DPI metadata.
      // • Injects a pHYs chunk so the exported file reports 300 DPI correctly
      //   (without this, programs that default to "1 px = 1 mm" would open a
      //   6600-pixel-wide file as ~22 feet instead of 22 inches).
      // • Uses toBlob for memory efficiency (avoids base64 overhead).
      // • Falls back to toDataURL if toBlob returns null (e.g. canvas too large
      //   or browser quota exceeded in a sandboxed iframe).
      // • Appends the anchor to document.body before clicking — required in
      //   sandboxed / iframed pages for the download to actually fire.
      const downloadCanvasAsPng = (canvas: HTMLCanvasElement, filename: string) =>
        new Promise<void>((resolve, reject) => {
          const triggerDownload = (url: string) => {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              resolve();
            }, 500);
          };

          canvas.toBlob(async blob => {
            if (!blob) {
              // toBlob returned null — fall back to toDataURL.
              const dataUrl = canvas.toDataURL('image/png');
              if (!dataUrl || dataUrl === 'data:,') {
                reject(new Error('Canvas is empty or too large to export — try a smaller sheet or fewer tiles.'));
                return;
              }
              triggerDownload(dataUrl);
              return;
            }
            try {
              const dpiBlob = await injectPngDpi(blob, EXPORT_DPI);
              triggerDownload(URL.createObjectURL(dpiBlob));
            } catch {
              triggerDownload(URL.createObjectURL(blob));
            }
          }, 'image/png');
        });

      if (format === 'png') {
        // Transparent PNG per tile — one file for single-tile sheets, numbered
        // files when the sheet is taller than 24".
        for (let t = 0; t < numTiles; t++) {
          const tileTopIn    = t * EXPORT_MAX_TILE_IN;
          const tileBottomIn = Math.min((t + 1) * EXPORT_MAX_TILE_IN, canvasHeightIn);
          const tile = await renderTile(tileTopIn, tileBottomIn, true);
          setExportProgress({ current: t + 1, total: numTiles });
          const filename = numTiles === 1 ? `${safeName}.png` : `${safeName}_part${t + 1}.png`;
          await downloadCanvasAsPng(tile, filename);
        }
        const pageNote = numTiles > 1 ? ` (${numTiles} files)` : '';
        toast({ title: 'PNG downloaded!', description: `${CANVAS_WIDTH_IN}" × ${canvasHeightIn.toFixed(1)}" at 300 DPI${pageNote}.` });

      } else if (format === 'zip') {
        // Bundle all tiles as numbered transparent PNGs inside a single ZIP.
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let t = 0; t < numTiles; t++) {
          const tileTopIn    = t * EXPORT_MAX_TILE_IN;
          const tileBottomIn = Math.min((t + 1) * EXPORT_MAX_TILE_IN, canvasHeightIn);
          const tile = await renderTile(tileTopIn, tileBottomIn, true);
          setExportProgress({ current: t + 1, total: numTiles });
          const filename = numTiles === 1 ? `${safeName}.png` : `${safeName}_part${t + 1}.png`;
          const rawBlob: Blob = await new Promise(res => tile.toBlob(b => res(b!), 'image/png'));
          const blob = await injectPngDpi(rawBlob, EXPORT_DPI).catch(() => rawBlob);
          zip.file(filename, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 500);
        toast({ title: 'ZIP downloaded!', description: `${numTiles} transparent PNG${numTiles > 1 ? 's' : ''} at 300 DPI.` });

      } else if (format === 'stitch') {
        // Render each tile as a PNG blob, upload them all to the backend, and
        // let the server composite them with sharp.  This sidesteps every browser
        // canvas-taint / sandboxed-iframe restriction — the server has no such
        // limits and sharp handles transparency perfectly.
        const totalSteps = numTiles + 1; // +1 for the server round-trip
        const formData = new FormData();
        for (let t = 0; t < numTiles; t++) {
          const tileTopIn    = t * EXPORT_MAX_TILE_IN;
          const tileBottomIn = Math.min((t + 1) * EXPORT_MAX_TILE_IN, canvasHeightIn);
          const tile = await renderTile(tileTopIn, tileBottomIn, true);
          const blob = await new Promise<Blob>((resolve, reject) => {
            tile.toBlob(b => b ? resolve(b) : reject(new Error('Tile render failed — canvas returned an empty blob.')), 'image/png');
          });
          formData.append('tiles', blob, `tile_${t}.png`);
          setExportProgress({ current: t + 1, total: totalSteps });
        }

        // Ship tiles to the backend and receive the composited PNG.
        const resp = await fetch(apiUrl('/stitch'), {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({ error: 'Unknown server error' }));
          throw new Error(errBody.error ?? 'Stitch failed on the server');
        }
        const stitchedBlob = await resp.blob();
        setExportProgress({ current: totalSteps, total: totalSteps });

        const stitchUrl = URL.createObjectURL(stitchedBlob);
        const sa = document.createElement('a');
        sa.href = stitchUrl;
        sa.download = `${safeName}_stitched.png`;
        sa.style.display = 'none';
        document.body.appendChild(sa);
        sa.click();
        setTimeout(() => { document.body.removeChild(sa); URL.revokeObjectURL(stitchUrl); }, 500);
        toast({ title: 'Stitched PNG downloaded!', description: `${CANVAS_WIDTH_IN}" × ${canvasHeightIn.toFixed(1)}" — single transparent file at 300 DPI.` });

      }
    } catch (err) {
      console.error('Export error', err);
      toast({ title: 'Export failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [canvasItems, canvasHeightIn, activeSheetIndex, sheetNames, toast]);

  // Close download menu when clicking outside
  useEffect(() => {
    if (!showDownloadMenu) return;
    const handler = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDownloadMenu]);

  const isMobile = windowWidth < 1024;
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-md border-[4px] border-black bg-retro-bg p-8 shadow-[6px_6px_0px_#000]">
          <div className="text-6xl mb-4">🖥️</div>
          <h1 className="font-display text-3xl uppercase mb-4">Desktop Only</h1>
          <p className="font-bold text-lg mb-6">The Builder works best on a larger screen.</p>
          <Link to="/" className="bg-retro-pink text-white border-[3px] border-black font-display font-bold py-3 px-6 shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] transition-all">
            ← Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden cursor-default" style={{ fontFamily: 'sans-serif' }}>

      {/* ── Export progress overlay ─────────────────────────────────────── */}
      {exportProgress && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-[3px] border-black shadow-2xl p-8 w-80 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-retro-pink flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">Rendering at 300 DPI…</p>
                {exportProgress.total > 1 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Page {exportProgress.current} of {exportProgress.total}
                  </p>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-retro-pink transition-all duration-300"
                style={{ width: `${exportProgress.total > 0 ? Math.round((exportProgress.current / exportProgress.total) * 100) : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">Please wait — do not close this tab</p>
          </div>
        </div>
      )}

      {/* ── Add-to-cart progress overlay ────────────────────────────────── */}
      {cartAddProgress && (() => {
        const stages: { key: CartAddStage; label: string }[] = [
          { key: 'saving',    label: 'Saving project…' },
          { key: 'rendering', label: 'Rendering at 300 DPI…' },
          { key: 'uploading', label: 'Saving print file…' },
          { key: 'adding',    label: 'Adding to cart…' },
        ];
        const currentIdx = stages.findIndex(s => s.key === cartAddProgress.stage);
        const pct = cartAddProgress.stage === 'rendering' && cartAddProgress.tilesTotal > 0
          ? Math.round(25 + (cartAddProgress.tilesCurrent / cartAddProgress.tilesTotal) * 50)
          : { saving: 5, rendering: 25, uploading: 80, adding: 95 }[cartAddProgress.stage] ?? 5;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white border-[3px] border-black shadow-2xl p-8 w-96 flex flex-col gap-5">
              <p className="text-base font-bold text-gray-900 text-center">Adding to Cart</p>
              <div className="flex flex-col gap-2.5">
                {stages.map((s, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={s.key} className={`flex items-center gap-3 ${active ? 'text-gray-900' : done ? 'text-green-600' : 'text-gray-300'}`}>
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        {done
                          ? <Check size={16} className="text-green-600" />
                          : active
                            ? <Loader2 size={16} className="animate-spin text-retro-pink" />
                            : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />
                        }
                      </div>
                      <span className={`text-sm ${active ? 'font-bold' : ''}`}>
                        {s.label}
                        {active && s.key === 'rendering' && cartAddProgress.tilesTotal > 1 && (
                          <span className="font-normal text-gray-500 ml-1">
                            ({cartAddProgress.tilesCurrent}/{cartAddProgress.tilesTotal})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-retro-pink transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center">Please wait — do not close this tab</p>
            </div>
          </div>
        );
      })()}

      {/* ── TOP BAR ───────────────────────────────────────────────── */}
      <div className="flex items-center bg-black text-white border-b-[3px] border-black h-12 flex-shrink-0 z-20">

        {/* Logo / Exit */}
        <Link
          to="/"
          className="flex items-center px-4 h-full border-r-[3px] border-white/20 hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <FunkyFreshLogo size="xs" />
        </Link>

        {/* App title */}
        <div className="hidden lg:flex items-center px-4 h-full border-r-[3px] border-white/20 flex-shrink-0">
          <span className="font-display text-sm text-retro-yellow tracking-wide whitespace-nowrap">Gang Sheet Builder</span>
        </div>

        {/* Context-sensitive toolbar */}
        <div className="flex items-center gap-1 px-3 h-full flex-1 overflow-x-auto">
          {/* Always: Undo/Redo */}
          <ToolBtn icon={<Undo2 size={15} />} title="Undo (Ctrl+Z)" onClick={undo} disabled={historyIndex === 0} />
          <ToolBtn icon={<Redo2 size={15} />} title="Redo (Ctrl+Y)" onClick={redo} disabled={historyIndex >= history.length - 1} />
          <div className="w-px bg-white/20 h-6 mx-1" />

          {hasSelection ? (
            <>
              {/* Selection toolbar */}
              <ToolBtn icon={<Copy size={15} />} label="Duplicate" title="Duplicate (Ctrl+D)" onClick={duplicateSelectedItems} />
              <ToolBtn icon={<Trash2 size={15} />} label="Delete" title="Delete" onClick={removeSelectedCanvasItems} active danger />
              <div className="w-px bg-white/20 h-6 mx-1" />
              <ToolBtn icon={<RotateCcw size={15} />} label="Rot L" title="Rotate Left 90°" onClick={() => rotateSelectedItems(-90)} />
              <ToolBtn icon={<RotateCw size={15} />} label="Rot R" title="Rotate Right 90°" onClick={() => rotateSelectedItems(90)} />
              <ToolBtn icon={<FlipHorizontal2 size={15} />} label="Flip H" title="Flip Horizontal" onClick={() => flipSelectedItems('h')} />
              <ToolBtn icon={<FlipVertical2 size={15} />} label="Flip V" title="Flip Vertical" onClick={() => flipSelectedItems('v')} />
              {selectedItem && (
                <>
                  <div className="w-px bg-white/20 h-6 mx-1" />
                  <ToolBtn
                    icon={isUpscaling ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    label="Upscale 2×"
                    title="Upscale image 2× and update canvas size to match 300 DPI"
                    onClick={upscaleSelectedItem}
                    disabled={isUpscaling}
                  />
                </>
              )}
            </>
          ) : null}

          {/* Zoom */}
          <div className="flex items-center gap-1 ml-auto relative">
            <ToolBtn icon={<ZoomOut size={15} />} title="Zoom Out" onClick={() => setZoom(z => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))} />
            <button
              ref={zoomBtnRef}
              onClick={() => setShowZoomDropdown(d => !d)}
              className="flex items-center gap-0.5 text-xs text-white/80 font-bold px-2 py-1 border border-white/20 rounded hover:bg-white/10 transition-colors min-w-[72px] justify-between"
            >
              <span>{Math.round(zoom * 100)}%</span>
              <ChevronDown size={11} className={`transition-transform ${showZoomDropdown ? 'rotate-180' : ''}`} />
            </button>
            <ToolBtn icon={<ZoomIn size={15} />} title="Zoom In" onClick={() => setZoom(z => Math.min(30, parseFloat((z + 0.25).toFixed(2))))} />
            {showZoomDropdown && (() => {
              const rect = zoomBtnRef.current?.getBoundingClientRect();
              return (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setShowZoomDropdown(false)} />
                  <div
                    className="bg-white border border-gray-200 rounded shadow-lg py-1"
                    style={{
                      position: 'fixed',
                      top: rect ? rect.bottom + 4 : 0,
                      right: rect ? window.innerWidth - rect.right : 0,
                      width: rect ? rect.width : 72,
                      zIndex: 9999,
                    }}
                  >
                    {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000].map(pct => (
                      <button
                        key={pct}
                        onClick={() => { setZoom(pct / 100); setShowZoomDropdown(false); }}
                        className={`w-full text-center py-1.5 text-sm hover:bg-gray-100 transition-colors ${Math.round(zoom * 100) === pct ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Right: Project Name + Price + Buttons */}
        <div className="flex items-center gap-2 px-4 h-full border-l-[3px] border-white/20 flex-shrink-0">
          <button
            onClick={() => {
              if (!projectId) return;
              setRenameTargetProjectId(projectId);
              setProjectRenameValue(projectName);
              setRenameProjectModalOpen(true);
            }}
            title={projectId ? 'Click to rename' : undefined}
            className={`hidden lg:flex items-center gap-1 group text-white/70 text-[10px] max-w-[140px] ${projectId ? 'hover:text-white cursor-pointer' : 'cursor-default'}`}
          >
            <span className="truncate">{projectName || 'Untitled Project'}</span>
            {projectId && <Pencil size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />}
          </button>
          <div className="w-px bg-white/20 h-4 mx-0.5 hidden lg:block" />
          <div className="text-center mr-2">
            <div className="text-retro-yellow font-display text-lg leading-none">${totalPrice.toFixed(2)}</div>
            <div className="text-white/50 text-[10px] uppercase">{nonEmptySheets.length || 1} sheet{nonEmptySheets.length !== 1 ? 's' : ''}</div>
          </div>
          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Settings"
            className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/30 transition-colors text-white"
          >
            <Settings size={15} />
          </button>
          {/* Download dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(v => !v)}
              disabled={isExporting || canvasItems.length === 0}
              title="Download sheet"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 border border-white/30 transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download
              <ChevronDown size={12} />
            </button>
            {showDownloadMenu && (() => {
              const pngTiles = Math.ceil(canvasHeightIn / EXPORT_MAX_TILE_IN);
              const menuBtn = "w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-gray-800 hover:bg-retro-pink hover:text-white transition-colors text-left cursor-pointer";
              return (
                <div className="absolute right-0 top-full mt-1 w-60 bg-white border-[2px] border-black shadow-lg z-50">

                  {/* Print File — primary, full-sheet single transparent PNG */}
                  <div className="relative group">
                    <button
                      onClick={() => downloadSheet('stitch')}
                      className="w-full flex items-center gap-2 px-3 py-3 text-xs font-bold text-retro-pink border-[2px] border-retro-pink hover:bg-retro-pink hover:text-white transition-colors text-left cursor-pointer"
                    >
                      <FileImage size={14} />
                      Print File
                      <span className="ml-auto text-[10px] font-normal opacity-80">1 file</span>
                    </button>
                    <div className="hidden group-hover:block absolute left-full top-0 ml-2 w-56 bg-black text-white text-[10px] p-2 rounded shadow-lg z-50 leading-relaxed pointer-events-none">
                      Full-sheet transparent PNG at 300 DPI — ready to load straight into your RIP software for printing.
                    </div>
                  </div>

                  <div className="border-t-[2px] border-black" />

                  {/* PNG — transparent, per-tile (secondary) */}
                  <div className="relative group">
                    <button onClick={() => downloadSheet('png')} className={menuBtn}>
                      <FileImage size={14} />
                      PNG · tiles
                      {pngTiles > 1 && <span className="ml-auto text-[10px] font-normal text-gray-400">{pngTiles} files</span>}
                    </button>
                    {pngTiles > 1 ? (
                      <div className="hidden group-hover:block absolute left-full top-0 ml-2 w-52 bg-black text-white text-[10px] p-2 rounded shadow-lg z-50 leading-relaxed pointer-events-none">
                        Sheet exceeds 24″ — downloads as {pngTiles} separate numbered PNGs, each fully transparent at 300 DPI.
                      </div>
                    ) : (
                      <div className="hidden group-hover:block absolute left-full top-0 ml-2 w-52 bg-black text-white text-[10px] p-2 rounded shadow-lg z-50 leading-relaxed pointer-events-none">
                        Single transparent PNG at 300 DPI.
                      </div>
                    )}
                  </div>

                  {/* ZIP — all tiles bundled */}
                  <div className="relative group">
                    <button onClick={() => downloadSheet('zip')} className={menuBtn}>
                      <Download size={14} />
                      ZIP · PNG tiles
                      {pngTiles > 1 && <span className="ml-auto text-[10px] font-normal text-gray-400">{pngTiles} files</span>}
                    </button>
                    <div className="hidden group-hover:block absolute left-full top-0 ml-2 w-52 bg-black text-white text-[10px] p-2 rounded shadow-lg z-50 leading-relaxed pointer-events-none">
                      All tiles bundled into one ZIP archive. Each PNG is fully transparent at 300 DPI.
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 border border-white/30 transition-colors disabled:opacity-50"
          >
            {(isSaving || isAutoSaving) ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving…' : isAutoSaving ? 'Auto-saving…' : projectName ? 'Save' : 'Save As…'}
          </button>
          <button
            onClick={handleAddToCart}
            disabled={canvasItems.length === 0 || isAddingToCart}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border transition-colors ${
              canvasItems.length === 0 || isAddingToCart
                ? 'bg-gray-400 text-gray-600 border-gray-400/50 cursor-not-allowed'
                : 'bg-retro-pink hover:bg-retro-pink/80 text-white border-retro-pink/50 cursor-pointer'
            }`}
          >
            {isAddingToCart
              ? <><Loader2 size={14} className="animate-spin" /> Preparing…</>
              : <><ShoppingCart size={14} /> Add to Cart</>
            }
          </button>
          <button
            onClick={() => auth.isLoggedIn ? window.location.href = '/account' : login('/builder')}
            title={auth.isLoggedIn ? 'My Account' : 'Log In'}
            className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full transition-colors"
          >
            <User size={15} />
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── ICON STRIP ───────── */}
        <div className="w-14 bg-gray-900 border-r-[3px] border-black flex flex-col items-center py-2 gap-1 flex-shrink-0">
          <IconStripBtn
            icon={<ImageIcon size={18} />}
            label="Images"
            active={leftPanel === 'images'}
            onClick={() => setLeftPanel('images')}
          />
          <IconStripBtn
            icon={<Type size={18} />}
            label="Text"
            active={leftPanel === 'text'}
            onClick={() => setLeftPanel('text')}
          />
          <IconStripBtn
            icon={<BookImage size={18} />}
            label="Library"
            active={leftPanel === 'library'}
            onClick={() => {
              setLeftPanel('library');
              if (auth.isLoggedIn) fetchLibrary();
            }}
          />
          <IconStripBtn
            icon={<FolderOpen size={18} />}
            label="Projects"
            active={leftPanel === 'projects'}
            onClick={() => {
              setLeftPanel('projects');
              if (auth.isLoggedIn) fetchProjects();
            }}
          />
          <div className="flex-1" />
          <IconStripBtn
            icon={<ClipboardList size={18} />}
            label="Orders"
            active={leftPanel === 'orders'}
            onClick={() => {
              setLeftPanel('orders');
              setOrdersError(null);
              if (auth.isLoggedIn && gangSheetOrders.length === 0 && !isLoadingOrders) fetchOrders();
            }}
          />
        </div>

        {/* ── LEFT PANEL ──────── */}
        <div className="w-72 bg-white border-r-[3px] border-black flex flex-col flex-shrink-0">
          {leftPanel === 'images' && (
            <>
              {/* Upload zone */}
              <div className="p-3 border-b-[2px] border-gray-200">
                {!auth.isLoggedIn ? (
                  <div className="border-[3px] border-dashed border-gray-300 bg-gray-50 p-4 text-center flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Upload size={16} className="text-gray-400" />
                    </div>
                    <span className="font-bold text-xs text-gray-500">Log in to upload images</span>
                    <button
                      onClick={() => login('/builder')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-retro-pink text-white font-bold text-xs border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform"
                    >
                      <LogIn size={12} /> Log In
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-[3px] border-dashed cursor-pointer p-3 text-center transition-colors flex flex-col items-center gap-1 ${
                      isDragActive ? 'border-retro-pink bg-retro-pink/10' : 'border-gray-400 bg-gray-50 hover:bg-retro-pink/5'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-8 h-8 rounded-full bg-retro-pink flex items-center justify-center">
                      <Upload size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-xs text-gray-700">Upload Image</span>
                    <span className="text-[10px] text-gray-400">PNG, PDF, SVG, EPS, AI, JPG</span>
                    <span className="text-[10px] text-gray-400">Max 1GB</span>
                  </div>
                )}
              </div>

              {/* ── From Library accordion ── */}
              <div className="border-b-[2px] border-gray-200 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowFromLibrary(v => !v);
                    if (!showFromLibrary && auth.isLoggedIn && libraryImages.length === 0) fetchLibrary();
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-bold uppercase text-gray-500 tracking-wider hover:text-retro-pink hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-1"><BookImage size={12} /> From Library</span>
                  <ChevronDown size={12} className={`transition-transform ${showFromLibrary ? 'rotate-180' : ''}`} />
                </button>

                {showFromLibrary && (
                  <div className="px-3 pb-2">
                    {!auth.isLoggedIn ? (
                      <div className="text-center py-3">
                        <p className="text-xs text-gray-500 mb-2">Log in to access your library.</p>
                        <button
                          onClick={() => login('/builder')}
                          className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-retro-pink text-white font-bold text-xs rounded border-[2px] border-black shadow-[2px_2px_0px_#000]"
                        >
                          <LogIn size={12} /> Log In
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search library..."
                          value={fromLibrarySearch}
                          onChange={e => setFromLibrarySearch(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 border-[2px] border-gray-300 focus:border-retro-pink outline-none mb-2"
                        />
                        {isLoadingLibrary ? (
                          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
                        ) : (() => {
                          const projectPaths = new Set(library.map(i => i.objectPath).filter(Boolean));
                          const available = libraryImages.filter(li =>
                            !projectPaths.has(li.objectPath) &&
                            (!fromLibrarySearch || li.name.toLowerCase().includes(fromLibrarySearch.toLowerCase()))
                          );
                          return available.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">
                              {libraryImages.length === 0 ? 'Your library is empty.' : 'All library images are already in this project.'}
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                              {available.map(li => (
                                <div key={li.id} className="relative group border-[2px] border-gray-200 rounded overflow-hidden bg-gray-50 cursor-pointer hover:border-retro-pink transition-colors"
                                  onClick={() => {
                                    setLibrary(prev => prev.some(i => i.objectPath === li.objectPath) ? prev : [...prev, {
                                      id: li.id, url: li.url, name: li.name,
                                      naturalW: li.naturalW, naturalH: li.naturalH,
                                      fileDPI: li.fileDPI, docWidthIn: li.docWidthIn,
                                      docHeightIn: li.docHeightIn, objectPath: li.objectPath,
                                      uploading: false,
                                    }]);
                                  }}
                                >
                                  <img src={li.url} alt={li.name} className="w-full h-16 object-contain p-1" />
                                  <div className="px-1 py-0.5 text-[9px] text-gray-600 truncate">{li.name}</div>
                                  <div className="absolute inset-0 bg-retro-pink/0 group-hover:bg-retro-pink/10 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-retro-pink bg-white border border-retro-pink rounded px-1.5 py-0.5 shadow">+ Add</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b-[2px] border-gray-200 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border-[2px] border-gray-300 focus:border-retro-pink outline-none"
                />
              </div>

              {/* Library label */}
              <div className="px-3 py-1.5 border-b-[2px] border-gray-200 bg-gray-50 flex-shrink-0">
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Project Images</span>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredLibrary.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs mt-8 px-4">
                    {library.length === 0 ? 'Upload images to get started' : 'No images match your search'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredLibrary.map(img => {
                      const count = getImageCount(img.id);
                      return (
                        <div key={img.id} className="relative group cursor-pointer" onClick={() => !img.uploading && addToCanvas(img)}>
                          <div className={`border-[2px] bg-gray-50 aspect-square flex items-center justify-center overflow-hidden transition-colors relative ${img.uploading ? 'border-blue-300' : 'border-gray-200 hover:border-retro-pink'}`}>
                            <img src={img.url} className={`max-w-full max-h-full object-contain p-1 ${img.uploading ? 'opacity-50' : ''}`} />
                            {img.uploading ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                <Loader2 size={18} className="animate-spin text-blue-500" />
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={e => { e.stopPropagation(); !img.uploading && addToCanvas(img); }}
                                  title="Add to canvas"
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <div className="bg-retro-pink text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                                    <Plus size={13} />
                                  </div>
                                </button>
                                <div className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm border border-white/60">
                                  {count}
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteProjectImageId(img.id); }}
                            title="Remove from project"
                            className="absolute top-2 left-2 bg-white text-red-500 rounded text-[10px] border border-black shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-0.5 cursor-pointer"
                          >
                            <Trash size={10} />
                          </button>
                          <div className="text-[10px] text-gray-600 truncate mt-0.5 leading-tight font-medium">{img.name}</div>
                          <div className="text-[10px] text-gray-400">
                            {(img.naturalW / 300).toFixed(2)}" × {(img.naturalH / 300).toFixed(2)}"
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </>
          )}

          {leftPanel === 'library' && (
            <LibraryPanel
              auth={auth}
              login={login}
              libraryImages={libraryImages}
              setLibraryImages={setLibraryImages}
              isLoadingLibrary={isLoadingLibrary}
              fetchLibrary={fetchLibrary}
              deleteFromLibrary={deleteFromLibrary}
              addToCanvas={(item: LibraryItem) => {
                const img: UploadedImage = {
                  id: item.id, url: item.url, name: item.name,
                  naturalW: item.naturalW, naturalH: item.naturalH,
                  fileDPI: item.fileDPI, docWidthIn: item.docWidthIn,
                  docHeightIn: item.docHeightIn, objectPath: item.objectPath,
                  uploading: false,
                };
                // Add to project images if not already there
                setLibrary(prev =>
                  prev.some(i => i.objectPath && i.objectPath === item.objectPath)
                    ? prev
                    : [...prev, img]
                );
                addToCanvas(img);
              }}
              apiUrl={apiUrl}
              toast={toast}
              onConfirmDeleteLibraryItem={setConfirmDeleteLibraryItem}
            />
          )}

          {leftPanel === 'text' && (
            <div className="p-3 flex flex-col gap-3">
              {!auth.isLoggedIn ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bold size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-700 mb-1">Log in to use text</p>
                    <p className="text-[10px] text-gray-400">Add custom text to your gang sheet after logging in.</p>
                  </div>
                  <button
                    onClick={() => login('/builder')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-retro-pink text-white font-bold text-xs border-[2px] border-black shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform"
                  >
                    <LogIn size={12} /> Log In
                  </button>
                </div>
              ) : (
              <><div className="font-bold text-sm border-b-[2px] border-gray-200 pb-2">Add Text</div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Text</label>
                <textarea
                  value={textValue}
                  onChange={e => setTextValue(e.target.value)}
                  placeholder="Type your text..."
                  className="w-full text-sm px-2 py-1.5 border-[2px] border-gray-300 focus:border-retro-pink outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Font</label>
                <select
                  value={textFont}
                  onChange={e => setTextFont(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border-[2px] border-gray-300 focus:border-retro-pink outline-none"
                >
                  <option value="Impact">Impact</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Color</label>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                  className="w-full h-8 border-[2px] border-gray-300 cursor-pointer" />
              </div>
              <button
                disabled={!textValue.trim()}
                onClick={() => toast({ title: 'Text', description: 'Text on canvas coming soon!' })}
                className="w-full bg-retro-purple text-white font-bold text-xs py-2 border-[2px] border-black disabled:opacity-40 hover:bg-retro-purple/80 transition-colors"
              >
                Add to Canvas
              </button>
              <p className="text-[10px] text-gray-400 text-center">Text elements coming soon</p>
              </>
              )}
            </div>
          )}

          {leftPanel === 'projects' && (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2.5 border-b-[2px] border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">My Projects</span>
                {auth.isLoggedIn && (
                  <button onClick={fetchProjects} className="text-[10px] text-retro-pink hover:underline">Refresh</button>
                )}
              </div>
              {auth.isLoggedIn && (
                <div className="px-3 py-2.5 border-b-[2px] border-gray-200">
                  <button
                    onClick={() => {
                      setLibrary([]);
                      setSheets([[]]);
                      setSheetNames(['Sheet 1']);
                      setActiveSheetIndex(0);
                      setProjectId(null);
                      setProjectName('');
                      setHistory([[[ ]]]);
                      setHistoryIndex(0);
                      setSelectedCanvasItems(new Set());
                      clearActiveProjectFromLS();
                      clearDraftFromLS();
                      toast({ title: 'New project', description: 'Started a fresh project.' });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-retro-pink text-white text-xs font-bold px-3 py-2 border-[2px] border-black hover:bg-retro-pink/80 transition-colors"
                  >
                    <Plus size={13} /> New Project
                  </button>
                </div>
              )}
              {!auth.isLoggedIn ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4 text-center">
                  <FolderOpen size={32} className="text-gray-300" />
                  <p className="text-xs text-gray-500">Log in with your Shopify account to save and load projects.</p>
                  <button
                    onClick={() => login("/builder")}
                    className="flex items-center gap-1.5 bg-retro-pink text-white text-xs font-bold px-4 py-2 border-[2px] border-black hover:bg-retro-pink/80 transition-colors"
                  >
                    <LogIn size={13} /> Log In
                  </button>
                </div>
              ) : isLoadingProjects ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center">
                  <FolderOpen size={32} className="text-gray-300" />
                  <p className="text-xs text-gray-500">No saved projects yet. Click <strong>Save As…</strong> to save your current work.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                  {projects.map(proj => (
                    <button
                      key={proj.id}
                      onClick={() => handleLoadProject(proj)}
                      className={`w-full text-left px-3 py-2.5 border-[2px] hover:border-retro-pink transition-colors group relative ${
                        projectId === proj.id ? 'border-retro-pink bg-retro-pink/5' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-gray-800 pr-14 truncate">{proj.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(proj.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {projectId === proj.id && <span className="ml-1 text-retro-pink font-bold">• Active</span>}
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setRenameTargetProjectId(proj.id);
                            setProjectRenameValue(proj.name);
                            setRenameProjectModalOpen(true);
                          }}
                          className="text-gray-300 hover:text-retro-pink transition-colors"
                          title="Rename project"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={e => handleDeleteProject(proj, e)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete project"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {leftPanel === 'orders' && (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2.5 border-b-[2px] border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Gang Sheet Orders</span>
                {auth.isLoggedIn && (
                  <button onClick={fetchOrders} className="text-[10px] text-retro-pink hover:underline">Refresh</button>
                )}
              </div>
              {!auth.isLoggedIn ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4 text-center">
                  <ClipboardList size={32} className="text-gray-300" />
                  <p className="text-xs text-gray-500">Log in to view your gang sheet order history.</p>
                  <button
                    onClick={() => login("/builder")}
                    className="flex items-center gap-1.5 bg-retro-pink text-white text-xs font-bold px-4 py-2 border-[2px] border-black hover:bg-retro-pink/80 transition-colors"
                  >
                    <LogIn size={13} /> Log In
                  </button>
                </div>
              ) : isLoadingOrders ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : ordersError ? (
                <div className="p-3">
                  <p className="text-xs text-red-500 font-bold">{ordersError}</p>
                </div>
              ) : gangSheetOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 p-4 text-center">
                  <ClipboardList size={32} className="text-gray-300" />
                  <p className="text-xs text-gray-500">No confirmed orders yet. Orders appear here after payment is complete.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col divide-y-[2px] divide-gray-100">
                  {gangSheetOrders.map(order => {
                    const isExpanded = expandedOrderId === order.id;
                    const sheetCount = order.sheetCount ?? 0;
                    const imageCount = order.imageCount ?? 0;
                    const lengthFt = order.canvasHeightIn != null ? (order.canvasHeightIn / 12).toFixed(2) : null;
                    const statusColor =
                      order.status === 'confirmed' ? 'bg-retro-teal text-white' :
                      order.status === 'fulfilled' ? 'bg-retro-lime text-black' :
                      order.status === 'cancelled' ? 'bg-gray-800 text-white' :
                      'bg-retro-yellow text-black';
                    return (
                      <div key={order.id} className="bg-white">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {order.totalPrice != null && (
                                <span className="font-bold text-xs text-gray-800">${order.totalPrice.toFixed(2)}</span>
                              )}
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border border-black ${statusColor}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              <span className="mr-1.5">Order #{order.id}</span>
                              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                          <ChevronDown size={13} className={`flex-shrink-0 mt-1 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100 space-y-2">
                            <div className="flex gap-4 pt-2 text-[10px] font-bold text-gray-500 uppercase">
                              <span>{sheetCount} sheet{sheetCount !== 1 ? 's' : ''}</span>
                              <span>{imageCount} image{imageCount !== 1 ? 's' : ''}</span>
                              {lengthFt && <span>{lengthFt} ft long</span>}
                            </div>
                            {order.projectId && (
                              <button
                                onClick={() => window.location.href = `/builder?projectId=${order.projectId}`}
                                className="flex items-center gap-1 text-[10px] font-bold text-retro-teal hover:underline mt-1"
                              >
                                <ExternalLink size={10} /> Open saved project
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CANVAS AREA ─────── */}
        <div className="flex-1 bg-gray-200 overflow-hidden flex flex-col">
          {/* Canvas viewport */}
          <div className="flex-1 overflow-hidden relative" ref={canvasAreaRef}>

            {/* Corner square */}
            <div className="absolute top-0 left-0 w-6 h-6 bg-white border-r border-b border-gray-300 z-10" />

            {/* Top ruler — pinned to top edge, spanning full width */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-white border-b border-gray-200 z-10 overflow-hidden">
              {containerSize.w > 0 && (() => {
                const RULER_H = 24;
                const stripW = containerSize.w;
                const canvasW = CANVAS_BASE_WIDTH * canvasScale;
                // Scroll area width (minus left ruler). Content is min 100% of scroll area,
                // and grows to fit canvas + 2×24px padding when canvas is wider.
                const scrollAreaW = stripW - 24;
                const scrollContentW = Math.max(scrollAreaW, canvasW + 48);
                const offsetX = 24 + (scrollContentW - canvasW) / 2 - scrollPos.x;
                const pxPerIn = PX_PER_INCH * canvasScale;
                const labelStep = pxPerIn * 5 >= 35 ? 5 : pxPerIn * 10 >= 35 ? 10 : pxPerIn * 20 >= 35 ? 20 : 40;
                return (
                  <svg width={stripW} height={RULER_H}>
                    {Array.from({ length: CANVAS_WIDTH_IN + 1 }, (_, i) => {
                      const x = offsetX + i * pxPerIn;
                      const isMajor = i % 5 === 0 || i === CANVAS_WIDTH_IN;
                      const nearEnd = CANVAS_WIDTH_IN - i > 0 && CANVAS_WIDTH_IN - i < labelStep;
                      const showLabel = (i % labelStep === 0 && !nearEnd) || i === CANVAS_WIDTH_IN;
                      const tickHeight = isMajor ? 18 : 10;
                      return (
                        <g key={i}>
                          <line x1={x} y1={0} x2={x} y2={tickHeight} stroke={isMajor ? '#444' : '#aaa'} strokeWidth={isMajor ? 1 : 0.75} />
                          {isMajor && showLabel && (
                            <text
                              x={x + 3} y={RULER_H - 2}
                              textAnchor="start"
                              fontSize="9" fontWeight="500" fill="#333"
                            >{i}</text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            {/* Left ruler — pinned to left edge, spanning full height */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-white border-r border-gray-200 z-10 overflow-hidden">
              {containerSize.h > 0 && (() => {
                const RULER_W = 24;
                const stripH = containerSize.h;
                const canvasH = canvasHeight * canvasScale;
                // Scroll area height (minus top ruler). Content is min 100% of scroll area,
                // and grows to fit canvas + 2×24px padding when canvas is taller.
                const scrollAreaH = stripH - 24;
                const scrollContentH = Math.max(scrollAreaH, canvasH + 48);
                const offsetY = 24 + (scrollContentH - canvasH) / 2 - scrollPos.y;
                const pxPerIn = PX_PER_INCH * canvasScale;
                const labelStep = pxPerIn * 5 >= 35 ? 5 : pxPerIn * 10 >= 35 ? 10 : pxPerIn * 20 >= 35 ? 20 : 40;
                return (
                  <svg width={RULER_W} height={stripH}>
                    {Array.from({ length: canvasHeightIn + 1 }, (_, i) => {
                      const y = offsetY + i * pxPerIn;
                      const isMajor = i % 5 === 0 || i === canvasHeightIn;
                      const showLabel = i % labelStep === 0 || i === canvasHeightIn;
                      const tickWidth = isMajor ? 18 : 10;
                      return (
                        <g key={i}>
                          <line x1={0} y1={y} x2={tickWidth} y2={y} stroke={isMajor ? '#444' : '#aaa'} strokeWidth={isMajor ? 1 : 0.75} />
                          {isMajor && showLabel && (
                            <text
                              x={RULER_W - 2} y={y - 4}
                              textAnchor="start" fontSize="9" fontWeight="500" fill="#333"
                              transform={`rotate(-90, ${RULER_W - 2}, ${y - 4})`}
                            >{i}</text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            {/* Inner canvas area — inset by ruler width, scrollable */}
            {/* Persistent overlap alert — shown at rest when images overlap */}
            {collidingItemIds.size > 0 && !draggingItemId && !resizingItemId && (
              <div className="absolute bottom-4 left-8 z-50 flex items-start gap-2.5 bg-red-50 border border-red-300 text-red-800 text-xs font-medium px-3 py-2.5 rounded shadow-md max-w-xs pointer-events-none">
                <svg className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <span>
                  {collidingItemIds.size === 1
                    ? '1 image is overlapping another. Move or resize images to fix.'
                    : `${collidingItemIds.size} images are overlapping. Move or resize images to fix.`}
                </span>
              </div>
            )}

            <div
              ref={scrollAreaRef}
              className="absolute top-6 left-6 right-0 bottom-0 overflow-auto select-none"
              onScroll={e => {
                const el = e.currentTarget;
                setScrollPos({ x: el.scrollLeft, y: el.scrollTop });
              }}
              onClick={() => { if (!justFinishedRubberBandRef.current) setSelectedCanvasItems(new Set()); }}
            >
              <div style={{ minWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box' }}>

              {/* Canvas */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: CANVAS_BASE_WIDTH * canvasScale,
                  height: canvasHeight * canvasScale,
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: '4px 4px 16px rgba(0,0,0,0.2)'
                }}
              >
                  <div
                    ref={canvasRef}
                    className="bg-white relative cursor-crosshair"
                    style={{
                      width: CANVAS_BASE_WIDTH,
                      height: canvasHeight,
                      transform: `scale(${canvasScale})`,
                      transformOrigin: 'top left',
                      backgroundImage: 'linear-gradient(45deg,#e8e8e8 25%,transparent 25%),linear-gradient(-45deg,#e8e8e8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8e8e8 75%),linear-gradient(-45deg,transparent 75%,#e8e8e8 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                      userSelect: 'none',
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={() => {
                      if (isDraggingSelection) { setIsDraggingSelection(false); setDragStartPos(null); }
                    }}
                    onContextMenu={e => e.preventDefault()}
                  >
                    {/* Selection box */}
                    {isDrawingSelectionBox && selectionBox && (
                      <div
                        className="absolute bg-retro-pink/20 border-[2px] border-dashed border-retro-pink pointer-events-none z-20"
                        style={{
                          left: Math.min(selectionBox.startX, selectionBox.endX),
                          top: Math.min(selectionBox.startY, selectionBox.endY),
                          width: Math.abs(selectionBox.endX - selectionBox.startX),
                          height: Math.abs(selectionBox.endY - selectionBox.startY),
                        }}
                      />
                    )}

                    {/* Canvas items */}
                    {canvasItems.map(item => {
                      const isSelected = selectedCanvasItems.has(item.id);
                      const isHovered = hoveredItemId === item.id;
                      const isResizing = resizingItemId === item.id;
                      const isBeingDragged = draggingItemId === item.id;
                      const isColliding     = collidingItemIds.has(item.id);
                      const isNudgeFlashing = nudgeFlashIds.has(item.id);

                      // Compute live DPI color — use resizeDisplay dims when this item is being resized
                      const liveDpiWidth = isResizing && resizeDisplay ? resizeDisplay.width : item.width;
                      const liveDpiHeight = isResizing && resizeDisplay ? resizeDisplay.height : item.height;
                      const { color: dpiColor } = getDPILabel(getDPI({ ...item, width: liveDpiWidth, height: liveDpiHeight }));

                      // Border: selected/drag/resize → full DPI colour
                      //         nudge flash → bright orange (collision indicator)
                      //         hover/drag-colliding → dim DPI colour
                      //         idle → invisible
                      const borderColor = (isBeingDragged || isResizing || isSelected)
                        ? dpiColor
                        : isColliding
                          ? '#ff000066'
                          : isNudgeFlashing
                            ? '#FF6B35'
                            : isHovered
                              ? `${dpiColor}55`
                              : 'transparent';

                      // Controlled position:
                      // - Single-item drag: use dragConstrainedPos (collision-constrained by Rnd's own logic)
                      // - Multi-item drag: use item.x/y from canvasItems (updated by group drag in onDrag)
                      //   so the dragged item stays locked to the group and doesn't break away.
                      const rndPos = isBeingDragged && dragConstrainedPos && selectedCanvasItems.size <= 1
                        ? dragConstrainedPos
                        : { x: item.x, y: item.y };

                      return (
                        <Rnd
                          key={item.id}
                          size={{ width: item.width, height: item.height }}
                          position={rndPos}
                          scale={canvasScale}
                          onDragStart={() => {
                            setDraggingItemId(item.id);
                            dragConstrainedPosRef.current = { x: item.x, y: item.y };
                            setDragConstrainedPos({ x: item.x, y: item.y });
                          }}
                          onDrag={(_e, d) => {
                            if (selectedCanvasItems.size > 1) {
                              // Multi-selection group drag: move ALL selected items together.
                              // Collision is checked PER-ITEM (not just the group bounding box)
                              // so that walls sitting inside the gaps between selected items are
                              // not incorrectly ignored by the sweep algorithm.
                              const selectedItems = canvasItems.filter(i => selectedCanvasItems.has(i.id));
                              const walls = canvasItems.filter(i => !selectedCanvasItems.has(i.id));
                              const groupX = Math.min(...selectedItems.map(i => i.x));
                              const groupY = Math.min(...selectedItems.map(i => i.y));
                              const groupW = Math.max(...selectedItems.map(i => i.x + i.width)) - groupX;
                              const groupH = Math.max(...selectedItems.map(i => i.y + i.height)) - groupY;
                              // Clamp the group to canvas bounds first.
                              const clampedDx = Math.max(0, Math.min(groupX + d.deltaX, CANVAS_BASE_WIDTH - groupW)) - groupX;
                              const clampedDy = Math.max(0, Math.min(groupY + d.deltaY, canvasHeight - groupH)) - groupY;
                              let resolvedDx = clampedDx;
                              let resolvedDy = clampedDy;
                              const allCollidingIds = new Set<string>();
                              if (enableCollisionDetection) {
                                for (const selItem of selectedItems) {
                                  const { x: rx, y: ry, collidingIds } = resolveCollision(
                                    { width: selItem.width, height: selItem.height },
                                    selItem.x + clampedDx, selItem.y + clampedDy,
                                    selItem.x, selItem.y,
                                    walls,
                                  );
                                  collidingIds.forEach(id => allCollidingIds.add(id));
                                  const itemDx = rx - selItem.x;
                                  const itemDy = ry - selItem.y;
                                  // Use the most restrictive movement across all items.
                                  if (clampedDx >= 0) resolvedDx = Math.min(resolvedDx, itemDx);
                                  else resolvedDx = Math.max(resolvedDx, itemDx);
                                  if (clampedDy >= 0) resolvedDy = Math.min(resolvedDy, itemDy);
                                  else resolvedDy = Math.max(resolvedDy, itemDy);
                                }
                              }
                              updateActiveSheet(prev => prev.map(i =>
                                selectedCanvasItems.has(i.id) ? { ...i, x: i.x + resolvedDx, y: i.y + resolvedDy } : i
                              ), false);
                              setCollidingItemIds(allCollidingIds);
                              dragMovedRef.current = true;
                              return;
                            }
                            // Single-item drag: individual collision via dragConstrainedPos
                            const prev = dragConstrainedPosRef.current ?? { x: item.x, y: item.y };
                            let proposedX = prev.x + d.deltaX;
                            let proposedY = prev.y + d.deltaY;
                            proposedX = Math.max(0, Math.min(proposedX, CANVAS_BASE_WIDTH - item.width));
                            proposedY = Math.max(0, Math.min(proposedY, canvasHeight - item.height));
                            const walls = canvasItems.filter(i => i.id !== item.id && !selectedCanvasItems.has(i.id));
                            const { x, y, collidingIds } = enableCollisionDetection ? resolveCollision(item, proposedX, proposedY, prev.x, prev.y, walls) : { x: proposedX, y: proposedY, collidingIds: new Set() };
                            dragConstrainedPosRef.current = { x, y };
                            setDragConstrainedPos({ x, y });
                            setCollidingItemIds(collidingIds);
                          }}
                          onDragStop={() => {
                            if (selectedCanvasItems.size > 1) {
                              // Positions already committed per-frame in onDrag — just record history.
                              // Also clean up selection-drag state since handleCanvasMouseUp may not
                              // fire when Rnd consumes the pointer events.
                              if (dragMovedRef.current) {
                                recordHistory(sheetsRef.current);
                                dragMovedRef.current = false;
                              }
                              setIsDraggingSelection(false);
                              setDragStartPos(null);
                              setCollidingItemIds(new Set());
                            } else {
                              // Single item: commit the collision-constrained position.
                              const pos = dragConstrainedPosRef.current ?? { x: item.x, y: item.y };
                              updateActiveSheet(prev => prev.map(i => i.id === item.id ? { ...i, ...pos } : i));
                              // Re-check overlaps at the final position so persistent resize-overlap
                              // borders only clear once the issue is actually resolved.
                              if (enableCollisionDetection) {
                                const finalItem = { ...item, ...pos };
                                const walls = canvasItems.filter(i => i.id !== item.id);
                                const stillOverlapping = new Set(
                                  walls.filter(o =>
                                    finalItem.x < o.x + o.width && finalItem.x + finalItem.width > o.x &&
                                    finalItem.y < o.y + o.height && finalItem.y + finalItem.height > o.y
                                  ).map(o => o.id)
                                );
                                setCollidingItemIds(stillOverlapping);
                              } else {
                                setCollidingItemIds(new Set());
                              }
                            }
                            lastMovedItemIdRef.current = item.id;
                            setDraggingItemId(null);
                            setDragConstrainedPos(null);
                            dragConstrainedPosRef.current = null;
                          }}
                          onResizeStart={() => {
                            setResizingItemId(item.id);
                            setSelectedCanvasItems(new Set([item.id]));
                            resizeOverlapToastShownRef.current = false;
                            const walls = canvasItems.filter(i => i.id !== item.id);
                            const preExistingOverlapIds = new Set(
                              walls
                                .filter(o =>
                                  item.x < o.x + o.width && item.x + item.width > o.x &&
                                  item.y < o.y + o.height && item.y + item.height > o.y
                                )
                                .map(o => o.id)
                            );
                            resizeStartGeomRef.current = { x: item.x, y: item.y, width: item.width, height: item.height, preExistingOverlapIds };
                          }}
                          onResize={(_e, _dir, ref, _delta, pos) => {
                            const w = parseInt(ref.style.width), h = parseInt(ref.style.height);
                            const rx = pos.x, ry = pos.y;
                            if (enableCollisionDetection) {
                              const orig = resizeStartGeomRef.current;
                              const preExisting = orig?.preExistingOverlapIds ?? new Set<string>();
                              const walls = canvasItems.filter(i => i.id !== item.id);
                              const newOverlaps = new Set(
                                walls
                                  .filter(o =>
                                    !preExisting.has(o.id) &&
                                    rx < o.x + o.width && rx + w > o.x &&
                                    ry < o.y + o.height && ry + h > o.y
                                  )
                                  .map(o => o.id)
                              );
                              setCollidingItemIds(newOverlaps);
                            }
                            updateActiveSheet(prev => prev.map(i =>
                              i.id === item.id ? { ...i, width: w, height: h, x: rx, y: ry } : i
                            ), false);
                            setResizeDisplay({ width: w, height: h, x: rx, y: ry });
                            if (item.id === selectedItemIds[0]) {
                              setEditW((w / PX_PER_INCH).toFixed(2));
                              setEditH((h / PX_PER_INCH).toFixed(2));
                            }
                          }}
                          onResizeStop={(_e, _dir, ref, _delta, pos) => {
                            const w = parseInt(ref.style.width), h = parseInt(ref.style.height);
                            const rx = pos.x, ry = pos.y;
                            updateActiveSheet(prev => prev.map(i =>
                              i.id === item.id ? { ...i, width: w, height: h, x: rx, y: ry } : i
                            ));
                            if (enableCollisionDetection) {
                              const orig = resizeStartGeomRef.current;
                              const preExisting = orig?.preExistingOverlapIds ?? new Set<string>();
                              const walls = canvasItems.filter(i => i.id !== item.id);
                              const finalOverlaps = new Set(
                                walls
                                  .filter(o =>
                                    !preExisting.has(o.id) &&
                                    rx < o.x + o.width && rx + w > o.x &&
                                    ry < o.y + o.height && ry + h > o.y
                                  )
                                  .map(o => o.id)
                              );
                              setCollidingItemIds(finalOverlaps);
                            } else {
                              setCollidingItemIds(new Set());
                            }
                            resizeStartGeomRef.current = null;
                            resizeOverlapToastShownRef.current = false;
                            lastMovedItemIdRef.current = item.id;
                            setResizingItemId(null); setResizeDisplay(null);
                          }}
                          bounds="parent"
                          lockAspectRatio={lockAspectRatio}
                          className="group border-[2px] border-dashed transition-colors"
                          style={{ borderColor }}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          onMouseDown={e => !resizingItemId && handleItemMouseDown(item.id, e.ctrlKey || e.metaKey, e.shiftKey)}
                        >
                          <div className="w-full h-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
                            {(() => {
                              const rot = item.rotation ?? 0;
                              const is90or270 = rot === 90 || rot === 270;
                              const flipPart = [
                                item.flipH ? 'scaleX(-1)' : '',
                                item.flipV ? 'scaleY(-1)' : '',
                              ].filter(Boolean).join(' ');
                              return (
                                <img
                                  src={item.url}
                                  draggable={false}
                                  className="absolute pointer-events-none"
                                  style={is90or270 ? {
                                    width: item.height,
                                    height: item.width,
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(-50%, -50%) rotate(${rot}deg)${flipPart ? ' ' + flipPart : ''}`,
                                  } : {
                                    width: '100%',
                                    height: '100%',
                                    top: 0,
                                    left: 0,
                                    transform: [rot ? `rotate(${rot}deg)` : '', flipPart].filter(Boolean).join(' ') || undefined,
                                  }}
                                />
                              );
                            })()}
                            {(isSelected || isHovered || isColliding) && (
                              <>
                                {/* Corner dots — match the bounding box color (light when hovered/colliding, full when selected) */}
                                {[['top-0 left-0', '-translate-x-1/2 -translate-y-1/2'],
                                  ['top-0 right-0', 'translate-x-1/2 -translate-y-1/2'],
                                  ['bottom-0 left-0', '-translate-x-1/2 translate-y-1/2'],
                                  ['bottom-0 right-0', 'translate-x-1/2 translate-y-1/2']].map(([pos, tr], i) => (
                                  <div key={i} className={`absolute ${pos} w-2.5 h-2.5 bg-white rounded-full pointer-events-none transform ${tr} border-[2px]`} style={{ borderColor }} />
                                ))}
                              </>
                            )}
                          </div>
                        </Rnd>
                      );
                    })}



                    {/* Resize display */}
                    {resizingItemId && resizeDisplay && (
                      <div
                        className="absolute pointer-events-none z-50 bg-black text-white text-xs px-2 py-1 font-bold"
                        style={{
                          left: resizeDisplay.x * canvasScale,
                          top: resizeDisplay.y * canvasScale,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {(resizeDisplay.width / PX_PER_INCH).toFixed(2)}" × {(resizeDisplay.height / PX_PER_INCH).toFixed(2)}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

        {/* ── RIGHT PANEL ──────── */}
        <div className="w-56 bg-white border-l-[3px] border-black flex flex-col flex-shrink-0 overflow-y-auto">

          {hasSelection && selectedItem ? (
            /* ── Object Properties ── */
            <div className="flex flex-col">
              <div className="px-3 py-2.5 bg-gray-900 text-white">
                <div className="font-bold text-sm">Object Properties</div>
                <button
                  onClick={() => setSelectedCanvasItems(new Set())}
                  className="absolute top-[52px] right-[1px] text-gray-400 hover:text-white p-1"
                  style={{ position: 'absolute', right: 4, top: 56 }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="px-3 py-2 border-b border-gray-100">
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Name</label>
                <div className="text-xs text-gray-700 truncate font-medium">{selectedItem.name}</div>
              </div>

              {/* Width / Height */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="flex items-center gap-1 mb-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 flex-1">Size (inches)</label>
                  <button
                    onClick={() => setLockAspectRatio(!lockAspectRatio)}
                    title={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                    className={`p-0.5 rounded transition-colors ${lockAspectRatio ? 'text-retro-pink' : 'text-gray-400'}`}
                  >
                    {lockAspectRatio ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <div className="text-[9px] text-gray-400 mb-0.5">W</div>
                    <input
                      type="number" step="0.01" min="0.1"
                      value={editW}
                      onChange={e => {
                        setEditW(e.target.value);
                        if (lockAspectRatio && selectedItem) {
                          const ratio = selectedItem.height / selectedItem.width;
                          setEditH((parseFloat(e.target.value) * ratio).toFixed(2));
                        }
                      }}
                      onBlur={applyDimensionEdit}
                      onKeyDown={e => e.key === 'Enter' && applyDimensionEdit()}
                      className="w-full text-xs px-1.5 py-1 border-[2px] border-gray-200 focus:border-retro-pink outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] text-gray-400 mb-0.5">H</div>
                    <input
                      type="number" step="0.01" min="0.1"
                      value={editH}
                      onChange={e => {
                        setEditH(e.target.value);
                        if (lockAspectRatio && selectedItem) {
                          const ratio = selectedItem.width / selectedItem.height;
                          setEditW((parseFloat(e.target.value) * ratio).toFixed(2));
                        }
                      }}
                      onBlur={applyDimensionEdit}
                      onKeyDown={e => e.key === 'Enter' && applyDimensionEdit()}
                      className="w-full text-xs px-1.5 py-1 border-[2px] border-gray-200 focus:border-retro-pink outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* X / Y position */}
              <div className="px-3 py-2 border-b border-gray-100">
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">Position (inches)</label>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <div className="text-[9px] text-gray-400 mb-0.5">X</div>
                    <input
                      type="number" step="0.01" min="0"
                      value={editX}
                      onChange={e => setEditX(e.target.value)}
                      onBlur={applyPositionEdit}
                      onKeyDown={e => e.key === 'Enter' && applyPositionEdit()}
                      className="w-full text-xs px-1.5 py-1 border-[2px] border-gray-200 focus:border-retro-pink outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] text-gray-400 mb-0.5">Y</div>
                    <input
                      type="number" step="0.01" min="0"
                      value={editY}
                      onChange={e => setEditY(e.target.value)}
                      onBlur={applyPositionEdit}
                      onKeyDown={e => e.key === 'Enter' && applyPositionEdit()}
                      className="w-full text-xs px-1.5 py-1 border-[2px] border-gray-200 focus:border-retro-pink outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* DPI */}
              <div className="px-3 py-2 border-b border-gray-100">
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Resolution</label>
                {(() => {
                  // Use live resize dimensions when the selected item is being dragged
                  const liveItem = (resizingItemId === selectedItem.id && resizeDisplay)
                    ? { ...selectedItem, width: resizeDisplay.width, height: resizeDisplay.height }
                    : selectedItem;
                  const dpi = getDPI(liveItem);
                  const { label, color } = getDPILabel(dpi);
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{dpi} DPI</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 border" style={{ color, borderColor: color }}>{label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Alignment */}
              <div className="px-3 py-2 border-b border-gray-100">
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">Snap to Edge</label>
                <div className="flex gap-1 mb-2">
                  <button onClick={() => alignItems('edge-top')} title="Snap to Top Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowUpToLine size={13} />
                    <span className="text-[9px] font-bold">Top</span>
                  </button>
                  <button onClick={() => alignItems('edge-bottom')} title="Snap to Bottom Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowDownToLine size={13} />
                    <span className="text-[9px] font-bold">Bot</span>
                  </button>
                  <button onClick={() => alignItems('edge-left')} title="Snap to Left Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowLeftToLine size={13} />
                    <span className="text-[9px] font-bold">Left</span>
                  </button>
                  <button onClick={() => alignItems('edge-right')} title="Snap to Right Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowRightToLine size={13} />
                    <span className="text-[9px] font-bold">Right</span>
                  </button>
                </div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">Center on Canvas</label>
                <div className="flex gap-1 mb-2">
                  <button onClick={() => alignItems('center-h')} title="Center Horizontally on Canvas" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <AlignCenterHorizontal size={13} />
                    <span className="text-[9px] font-bold">Horiz</span>
                  </button>
                  <button onClick={() => alignItems('center-v')} title="Center Vertically on Canvas" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <AlignCenterVertical size={13} />
                    <span className="text-[9px] font-bold">Vert</span>
                  </button>
                </div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">Align to Canvas</label>
                <div className="flex flex-col gap-1">
                  {([['Top', 'top'], ['Mid', 'middle'], ['Bot', 'bottom']] as const).map(([label, v]) => (
                    <div key={v} className="flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase text-gray-400 w-6 flex-shrink-0">{label}</span>
                      {(['left', 'center', 'right'] as const).map(h => (
                        <button
                          key={h}
                          onClick={() => alignItems(`${v}-${h}` as AlignType)}
                          title={`${label} ${h}`}
                          className="flex-1 flex items-center justify-center py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors"
                        >
                          {h === 'left' && <AlignLeft size={13} />}
                          {h === 'center' && <AlignCenter size={13} />}
                          {h === 'right' && <AlignRight size={13} />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-3 py-2 space-y-1.5">
                <button
                  onClick={() => { setResizeActiveTab('Full Front'); setResizeModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 border-[2px] border-black bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                >
                  <Crop size={13} /> Standard Sizes
                </button>
                <button
                  onClick={() => { setQuantityInput('1'); setQuantityModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 border-[2px] border-black bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                >
                  <Plus size={13} /> Add Quantity
                </button>
              </div>
            </div>

          ) : selectedCanvasItems.size > 1 ? (
            /* ── Multi-select ── */
            <div className="flex flex-col">
              <div className="px-3 py-2.5 bg-gray-900 text-white">
                <div className="font-bold text-sm">{selectedCanvasItems.size} Items Selected</div>
              </div>
              <div className="px-3 py-3 space-y-2">
                <div className="text-xs text-gray-500 mb-3">Multiple items selected</div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Snap Group to Edge</label>
                <div className="flex gap-1 mb-2">
                  <button onClick={() => alignItems('edge-top')} title="Snap to Top Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowUpToLine size={13} />
                    <span className="text-[9px] font-bold">Top</span>
                  </button>
                  <button onClick={() => alignItems('edge-bottom')} title="Snap to Bottom Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowDownToLine size={13} />
                    <span className="text-[9px] font-bold">Bot</span>
                  </button>
                  <button onClick={() => alignItems('edge-left')} title="Snap to Left Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowLeftToLine size={13} />
                    <span className="text-[9px] font-bold">Left</span>
                  </button>
                  <button onClick={() => alignItems('edge-right')} title="Snap to Right Edge" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <ArrowRightToLine size={13} />
                    <span className="text-[9px] font-bold">Right</span>
                  </button>
                </div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Center Group on Canvas</label>
                <div className="flex gap-1 mb-2">
                  <button onClick={() => alignItems('center-h')} title="Center Group Horizontally" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <AlignCenterHorizontal size={13} />
                    <span className="text-[9px] font-bold">Horiz</span>
                  </button>
                  <button onClick={() => alignItems('center-v')} title="Center Group Vertically" className="flex-1 flex flex-col items-center gap-0.5 py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors">
                    <AlignCenterVertical size={13} />
                    <span className="text-[9px] font-bold">Vert</span>
                  </button>
                </div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Align Group to Canvas</label>
                <div className="flex flex-col gap-1">
                  {([['Top', 'top'], ['Mid', 'middle'], ['Bot', 'bottom']] as const).map(([label, v]) => (
                    <div key={v} className="flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase text-gray-400 w-6 flex-shrink-0">{label}</span>
                      {(['left', 'center', 'right'] as const).map(h => (
                        <button
                          key={h}
                          onClick={() => alignItems(`${v}-${h}` as AlignType)}
                          title={`${label} ${h}`}
                          className="flex-1 flex items-center justify-center py-1.5 border-[2px] border-gray-200 hover:border-retro-pink hover:text-retro-pink transition-colors"
                        >
                          {h === 'left' && <AlignLeft size={13} />}
                          {h === 'center' && <AlignCenter size={13} />}
                          {h === 'right' && <AlignRight size={13} />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Add Group Quantity */}
                <div className="border-t border-gray-100 mt-3 pt-3">
                  <button
                    onClick={() => setGroupQuantityModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-retro-pink text-white text-xs font-bold hover:bg-retro-pink/80 transition-colors border-[2px] border-retro-pink"
                  >
                    <Plus size={13} />
                    Add Quantity
                  </button>
                </div>
              </div>
            </div>

          ) : (
            /* ── Sheet tabs ── */
            <div className="flex flex-col">
              <div className="px-3 py-2.5 bg-gray-900 text-white flex items-center justify-between">
                <span className="font-bold text-sm">Sheets</span>
                <button
                  onClick={addSheet}
                  className="text-xs font-bold px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/30 transition-colors"
                >
                  + Add
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {sheets.map((sheetItems, idx) => {
                  const MIN_H_IN = 12;
                  const maxBottomPx = sheetItems.reduce((m, item) => Math.max(m, item.y + item.height), 0);
                  // thumbHeightIn: visual-only thumbnail height — adds 2" breathing room for the preview box
                  const thumbHeightIn = maxBottomPx === 0 ? MIN_H_IN : Math.min(MAX_HEIGHT_IN, Math.max(MIN_H_IN, Math.ceil(maxBottomPx / PX_PER_INCH + 2)));
                  // metricHeightIn: authoritative height for Size / Area / Length / Price
                  // For the active sheet use the live canvasHeightIn (same source the canvas renders from).
                  // For other sheets compute the same way the canvas shrink logic does.
                  const metricHeightIn = idx === activeSheetIndex
                    ? canvasHeightIn
                    : (maxBottomPx === 0 ? MIN_H_IN : Math.max(MIN_H_IN, Math.round(maxBottomPx / PX_PER_INCH)));
                  const thumbHeightPx = Math.round(PX_PER_INCH * thumbHeightIn);
                  const thumbSheetPrice = Math.round(metricHeightIn * PRICE_PER_INCH * 100) / 100;

                  // Compute a uniform scale that fits the canvas into the preview box
                  // without distorting gaps. Both axes use the same thumbScale so
                  // horizontal and vertical spacing always match the real canvas.
                  const THUMB_MAX_W = 172;
                  const THUMB_MAX_H = 190;
                  const thumbScale = Math.min(THUMB_MAX_W / CANVAS_BASE_WIDTH, THUMB_MAX_H / thumbHeightPx);
                  const thumbDisplayW = Math.round(CANVAS_BASE_WIDTH * thumbScale);
                  const thumbDisplayH = Math.round(thumbHeightPx * thumbScale);

                  return (
                  <div
                    key={idx}
                    onClick={() => { if (renamingSheetIdx !== idx) setActiveSheetIndex(idx); }}
                    className={`p-2.5 cursor-pointer group transition-colors relative ${
                      idx === activeSheetIndex ? 'bg-retro-pink/10 border-l-[3px] border-retro-pink' : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                    }`}
                  >
                    {/* Mini canvas thumbnail — uniform scale for both axes */}
                    <div className="flex justify-center mb-2">
                    <div
                      className="bg-white border border-gray-200 relative overflow-hidden"
                      style={{
                        width: thumbDisplayW,
                        height: thumbDisplayH,
                        backgroundImage: 'linear-gradient(45deg,#f0f0f0 25%,transparent 25%),linear-gradient(-45deg,#f0f0f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f0f0f0 75%),linear-gradient(-45deg,transparent 75%,#f0f0f0 75%)',
                        backgroundSize: '6px 6px',
                        backgroundPosition: '0 0,0 3px,3px -3px,-3px 0'
                      }}
                    >
                      {sheetItems.map((item, i) => {
                        const rot = item.rotation ?? 0;
                        const is90or270 = rot === 90 || rot === 270;
                        const flipPart = [
                          item.flipH ? 'scaleX(-1)' : '',
                          item.flipV ? 'scaleY(-1)' : '',
                        ].filter(Boolean).join(' ');
                        const w = item.width * thumbScale;
                        const h = item.height * thumbScale;
                        return (
                          <div
                            key={i}
                            className="absolute overflow-hidden"
                            style={{ left: item.x * thumbScale, top: item.y * thumbScale, width: w, height: h }}
                          >
                            <img
                              src={item.url}
                              className="absolute"
                              style={is90or270 ? {
                                width: h,
                                height: w,
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${rot}deg)${flipPart ? ' ' + flipPart : ''}`,
                              } : {
                                width: '100%',
                                height: '100%',
                                top: 0,
                                left: 0,
                                transform: [rot ? `rotate(${rot}deg)` : '', flipPart].filter(Boolean).join(' ') || undefined,
                              }}
                            />
                          </div>
                        );
                      })}
                      {idx === activeSheetIndex && (
                        <div className="absolute inset-0 border-[2px] border-retro-pink pointer-events-none" />
                      )}
                    </div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        {renamingSheetIdx === idx ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setSheetNames(prev => { const n = [...prev]; n[idx] = renameValue.trim() || `Sheet ${idx + 1}`; return n; });
                                  setRenamingSheetIdx(null);
                                }
                                if (e.key === 'Escape') setRenamingSheetIdx(null);
                              }}
                              onBlur={() => {
                                setSheetNames(prev => { const n = [...prev]; n[idx] = renameValue.trim() || `Sheet ${idx + 1}`; return n; });
                                setRenamingSheetIdx(null);
                              }}
                              className="text-xs font-bold text-gray-800 border-b-[2px] border-retro-pink outline-none bg-transparent w-full"
                            />
                            <button
                              onClick={() => setRenamingSheetIdx(null)}
                              className="text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
                              title="Discard changes"
                            >
                              <X size={11} />
                            </button>
                            <button
                              onClick={() => {
                                setSheetNames(prev => { const n = [...prev]; n[idx] = renameValue.trim() || `Sheet ${idx + 1}`; return n; });
                                setRenamingSheetIdx(null);
                              }}
                              className="text-green-500 hover:text-green-600 flex-shrink-0 transition-colors"
                              title="Save changes"
                            >
                              <Check size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="text-xs font-bold text-gray-800 truncate">{sheetNames[idx] || `Sheet ${idx + 1}`}</div>
                            <button
                              onClick={e => { e.stopPropagation(); setRenameValue(sheetNames[idx] || `Sheet ${idx + 1}`); setRenamingSheetIdx(idx); }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-opacity"
                            >
                              <Pencil size={10} />
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-0 mt-2 border-t border-b border-gray-200">
                          <div className="text-center py-1 border-r border-gray-200">
                            <div className="text-[7px] text-gray-500 font-semibold">Size</div>
                            <div className="text-[9px] text-gray-400">{CANVAS_WIDTH_IN}" × {metricHeightIn}"</div>
                          </div>
                          <div className="text-center py-1">
                            <div className="text-[7px] text-gray-500 font-semibold">Area</div>
                            <div className="text-[9px] text-gray-400">{((CANVAS_WIDTH_IN * metricHeightIn) / 144).toFixed(1)} sq ft</div>
                          </div>
                          <div className="text-center py-1 border-r border-gray-200">
                            <div className="text-[7px] text-gray-500 font-semibold">Length</div>
                            <div className="text-[9px] text-gray-400">{(metricHeightIn / 12).toFixed(2)} ft</div>
                          </div>
                          <div className="text-center py-1">
                            <div className="text-[7px] text-gray-500 font-semibold">Items</div>
                            <div className="text-[9px] text-gray-400">{sheetItems.length}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-left">
                            <div className="text-[7px] text-gray-500 font-semibold uppercase">Cost / img</div>
                            <div className="text-[9px] text-gray-400">
                              {sheetItems.length > 0
                                ? `$${(thumbSheetPrice / sheetItems.length).toFixed(2)}`
                                : '—'}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-retro-purple">${thumbSheetPrice.toFixed(2)}</div>
                        </div>
                      </div>
                      {sheets.length > 1 && renamingSheetIdx !== idx && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteSheetIdx(idx); }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Delete Confirm Modal */}
      {deleteSheetIdx !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Sheet?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{sheetNames[deleteSheetIdx]}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteSheetIdx(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { removeSheet(deleteSheetIdx); setDeleteSheetIdx(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Canvas Item Confirmation */}
      {confirmDeleteCanvasItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete {selectedCanvasItems.size === 1 ? 'Image' : 'Images'}?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {selectedCanvasItems.size} item{selectedCanvasItems.size === 1 ? '' : 's'}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteCanvasItem(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doDeleteCanvasItems}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Library Item Confirmation */}
      {confirmDeleteLibraryItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Remove from Library?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove <strong>{confirmDeleteLibraryItem.name}</strong> from your library? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteLibraryItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteFromLibrary(confirmDeleteLibraryItem); setConfirmDeleteLibraryItem(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Image Confirmation */}
      {confirmDeleteProjectImageId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Remove from Project?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove this image from your project? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteProjectImageId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { removeFromSessionImages(confirmDeleteProjectImageId); setConfirmDeleteProjectImageId(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Project Confirmation Modal ── */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDeleteProject(null)}>
          <div className="bg-white border-[3px] border-black p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Project?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{confirmDeleteProject.name}"</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteProject(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border-[2px] border-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProjectConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 border-[2px] border-black transition-colors flex items-center gap-1.5"
              >
                <Trash size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Project Modal ── */}
      {renameProjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRenameProjectModalOpen(false)}>
          <div className="bg-white border-[3px] border-black p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Rename Project</h2>
            <p className="text-xs text-gray-500 mb-4">Enter a new name for this project.</p>
            <input
              type="text"
              value={projectRenameValue}
              onChange={e => setProjectRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameProjectCommit(); if (e.key === 'Escape') setRenameProjectModalOpen(false); }}
              placeholder="Project name…"
              className="w-full text-sm px-3 py-2 border-[2px] border-gray-300 focus:border-retro-pink outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRenameProjectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border-[2px] border-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameProjectCommit}
                disabled={!projectRenameValue.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-retro-pink hover:bg-retro-pink/80 border-[2px] border-black disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Check size={13} /> Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-white border-[3px] border-black p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Save Project</h2>
            <p className="text-xs text-gray-500 mb-4">Give your gang sheet project a name so you can find it later.</p>
            <input
              type="text"
              value={saveDialogName}
              onChange={e => setSaveDialogName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveConfirm(); if (e.key === 'Escape') setShowSaveDialog(false); }}
              placeholder="Project name…"
              className="w-full text-sm px-3 py-2 border-[2px] border-gray-300 focus:border-retro-pink outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border-[2px] border-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!saveDialogName.trim() || isSaving}
                className="px-4 py-2 text-sm font-bold text-white bg-retro-pink hover:bg-retro-pink/80 border-[2px] border-black disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-white border-[3px] border-black p-6 max-w-sm w-full mx-4 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-retro-pink/10 flex items-center justify-center mx-auto mb-3">
              <LogIn size={22} className="text-retro-pink" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Log In to Save</h2>
            <p className="text-sm text-gray-500 mb-5">
              Log in with your Shopify account to save your gang sheet projects and access them anytime — including your uploaded images.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border-[2px] border-gray-200 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={() => login("/builder")}
                className="px-5 py-2 text-sm font-bold text-white bg-retro-pink hover:bg-retro-pink/80 border-[2px] border-black transition-colors flex items-center gap-1.5"
              >
                <LogIn size={14} /> Log In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standard Sizes Modal ── */}
      {resizeModalOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setResizeModalOpen(false); }}
        >
          <div className="bg-white border-[3px] border-black w-[520px] max-h-[85vh] flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
              <span className="font-bold text-sm">Standard Sizes</span>
              <button onClick={() => setResizeModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex border-b-[2px] border-black overflow-x-auto flex-shrink-0">
              {Object.keys(STANDARD_SIZES).map(cat => (
                <button
                  key={cat}
                  onClick={() => setResizeActiveTab(cat)}
                  className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-r border-gray-200 transition-colors ${
                    resizeActiveTab === cat
                      ? 'bg-retro-pink text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Size groups */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">
                Image will be scaled to fit within the selected size, preserving its shape.
              </p>
              {STANDARD_SIZES[resizeActiveTab]?.groups.map(group => (
                <div key={group.label}>
                  <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">{group.label}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.sizes.map(size => (
                      <button
                        key={`${size.w}-${size.h}-${size.name}`}
                        onClick={() => setPendingSize({ w: size.w, h: size.h })}
                        className={`flex items-center justify-between px-3 py-2.5 border-[2px] transition-colors text-left group ${
                          pendingSize?.w === size.w && pendingSize?.h === size.h
                            ? 'border-retro-pink bg-pink-50 text-retro-pink'
                            : 'border-gray-200 hover:border-retro-pink hover:text-retro-pink hover:bg-pink-50'
                        }`}
                      >
                        <span className="text-xs font-bold">{size.name || group.label}</span>
                        <span className="text-xs font-mono text-gray-500 group-hover:text-retro-pink">{size.w}" × {size.h}"</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t-[2px] border-gray-200 flex-shrink-0 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Currently: <span className="font-bold">{(selectedItem.width / PX_PER_INCH).toFixed(1)}" × {(selectedItem.height / PX_PER_INCH).toFixed(1)}"</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setResizeModalOpen(false);
                    setPendingSize(null);
                  }}
                  className="px-4 py-1.5 text-xs font-bold border-[2px] border-gray-300 hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (pendingSize) {
                      applyStandardSize(pendingSize.w, pendingSize.h);
                      setResizeModalOpen(false);
                      setPendingSize(null);
                    }
                  }}
                  disabled={!pendingSize}
                  className={`px-4 py-1.5 text-xs font-bold border-[2px] transition-colors ${
                    pendingSize
                      ? 'border-retro-pink bg-retro-pink text-white hover:bg-pink-600 hover:border-pink-600'
                      : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100'
                  }`}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quantity Modal ── */}
      {quantityModalOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setQuantityModalOpen(false); }}
        >
          <div className="bg-white border-[3px] border-black w-80 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
              <span className="font-bold text-sm">Add Quantity</span>
              <button onClick={() => setQuantityModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Preview + input */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedItem.url}
                  alt={selectedItem.name}
                  className="w-14 h-14 object-contain border border-gray-200 bg-gray-50 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{selectedItem.name}</div>
                  <div className="text-xs text-gray-500">
                    {(selectedItem.width / PX_PER_INCH).toFixed(1)}" × {(selectedItem.height / PX_PER_INCH).toFixed(1)}"
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">
                  How many copies to add?
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quantityInput}
                  onChange={e => setQuantityInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const n = parseInt(quantityInput, 10);
                      if (n >= 1) addQuantity(n);
                    }
                    if (e.key === 'Escape') setQuantityModalOpen(false);
                  }}
                  autoFocus
                  className="w-full text-2xl font-bold text-center px-3 py-2 border-[2px] border-gray-300 focus:border-retro-pink outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  Copies will be placed with {enableGap ? `${gapIn}"` : 'min 0.05"'} gap and flow to new sheets if needed.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => setQuantityModalOpen(false)}
                className="flex-1 py-2 text-sm font-bold border-[2px] border-gray-300 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const n = parseInt(quantityInput, 10);
                  if (n >= 1) addQuantity(n);
                }}
                disabled={!quantityInput || parseInt(quantityInput, 10) < 1}
                className="flex-1 py-2 text-sm font-bold bg-retro-pink text-white border-[2px] border-black hover:bg-retro-pink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add {quantityInput && parseInt(quantityInput, 10) >= 1 ? parseInt(quantityInput, 10) : ''} Copies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Quantity Modal ── */}
      {groupQuantityModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setGroupQuantityModalOpen(false);
              setGroupQtyInput('1');
            }
          }}
        >
          <div className="bg-white border-[3px] border-black w-80 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
              <span className="font-bold text-sm">Add Quantity — Group</span>
              <button
                onClick={() => { setGroupQuantityModalOpen(false); setGroupQtyInput('1'); }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200">
                <div className="text-2xl font-bold text-gray-300 flex-shrink-0">{selectedCanvasItems.size}</div>
                <div>
                  <div className="text-xs font-bold text-gray-800">items selected</div>
                  <div className="text-[10px] text-gray-500 leading-snug">Each copy will be placed directly below the previous one, preserving the exact horizontal alignment and spacing.</div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">
                  How many copies of this group?
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={groupQtyInput}
                  onChange={e => setGroupQtyInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { const n = parseInt(groupQtyInput, 10); if (n >= 1) addGroupQuantity(n); }
                    if (e.key === 'Escape') { setGroupQuantityModalOpen(false); setGroupQtyInput('1'); }
                  }}
                  autoFocus
                  className="w-full text-2xl font-bold text-center px-3 py-2 border-[2px] border-gray-300 focus:border-retro-pink outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  Flows to a new sheet automatically if the current one fills up.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => { setGroupQuantityModalOpen(false); setGroupQtyInput('1'); }}
                className="flex-1 py-2 text-sm font-bold border-[2px] border-gray-300 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { const n = parseInt(groupQtyInput, 10); if (n >= 1) addGroupQuantity(n); }}
                disabled={!groupQtyInput || parseInt(groupQtyInput, 10) < 1}
                className="flex-1 py-2 text-sm font-bold bg-retro-pink text-white border-[2px] border-black hover:bg-retro-pink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add {groupQtyInput && parseInt(groupQtyInput, 10) >= 1 ? parseInt(groupQtyInput, 10) : ''} Copies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {settingsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setSettingsModalOpen(false); }}
        >
          <div className="bg-white border-[3px] border-black w-[380px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
              <span className="font-bold text-sm">Settings</span>
              <button onClick={() => setSettingsModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Settings */}
            <div className="p-6 space-y-6">
              {/* Gap Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-900">
                    Gap Spacing
                  </label>
                  <button
                    onClick={() => setEnableGap(!enableGap)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enableGap ? 'bg-retro-pink' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        enableGap ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Add spacing between images when adding, duplicating, or auto-arranging. A minimum 0.05" gap is always kept between images — even when this is off.
                </p>
                {enableGap && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      value={gapIn}
                      onChange={e => setGapIn(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-600">inches</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200" />

              {/* Collision Detection Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-900">
                    Collision Detection
                  </label>
                  <button
                    onClick={() => setEnableCollisionDetection(!enableCollisionDetection)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enableCollisionDetection ? 'bg-retro-pink' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        enableCollisionDetection ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Prevent items from overlapping when dragging
                </p>
              </div>

              <div className="border-t border-gray-200" />

              {/* Auto-save Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-900">
                    Auto-save
                  </label>
                  <button
                    onClick={() => setAutoSave(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSave ? 'bg-retro-pink' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        autoSave ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {autoSave && projectId !== null && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Save interval</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {AUTOSAVE_INTERVAL_OPTIONS.map(sec => {
                        const label = sec < 60 ? `${sec}s` : `${sec / 60} min`;
                        return (
                          <button
                            key={sec}
                            onClick={() => setAutoSaveIntervalSec(sec)}
                            className={`px-3 py-1 text-xs font-bold border-[2px] border-black transition-colors ${
                              autoSaveIntervalSec === sec
                                ? 'bg-retro-pink text-white'
                                : 'bg-white text-gray-800 hover:bg-gray-100'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  {!autoSave
                    ? 'Turn on to automatically save your project while you work.'
                    : projectId !== null
                      ? `Saves instantly when you add an image, and every ${autoSaveIntervalSec < 60 ? `${autoSaveIntervalSec} seconds` : `${autoSaveIntervalSec / 60} minute${autoSaveIntervalSec > 60 ? 's' : ''}`} after any other change.`
                      : 'Save or open a named project to activate auto-save.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t-[2px] border-gray-200 flex-shrink-0 flex justify-end">
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold border-[2px] border-retro-pink bg-retro-pink text-white hover:bg-pink-600 hover:border-pink-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper components ─────────────────────────────────────────

function ToolBtn({
  icon, label, title, onClick, active, danger, disabled
}: {
  icon: React.ReactNode; label?: string; title?: string;
  onClick?: () => void; active?: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center gap-1 text-xs px-2 py-1 transition-colors rounded-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
        danger
          ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
          : active
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      {label && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

function IconStripBtn({
  icon, label, active, onClick
}: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-1 w-full py-2.5 px-1 transition-colors text-[9px] font-bold uppercase tracking-wide ${
        active
          ? 'bg-white/10 border-l-2 border-retro-pink'
          : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
      }`}
    >
      <span className={active ? 'text-retro-pink' : ''}>{icon}</span>
      <span className={active ? 'text-white' : ''}>{label}</span>
    </button>
  );
}
