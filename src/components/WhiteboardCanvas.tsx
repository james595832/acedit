'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {Button} from '@astryxdesign/core/Button';

export type MarkerColor = '#1c1b18' | '#c83e3d' | '#d96b43' | '#2a6f97';

type StickyTone = 'bone' | 'ochre' | 'terra' | 'blue';

type StickyNote = {
  id: string;
  x: number;
  y: number;
  text: string;
  tone: StickyTone;
};

const INK_COLORS: {id: MarkerColor; label: string}[] = [
  {id: '#1c1b18', label: 'Ink'},
  {id: '#c83e3d', label: 'Brick'},
  {id: '#d96b43', label: 'Terra'},
  {id: '#2a6f97', label: 'Blue'},
];

const NOTE_TONES: {id: StickyTone; label: string; fill: string; ink: string}[] =
  [
    {id: 'bone', label: 'Bone', fill: '#f3efe4', ink: '#1c1b18'},
    {id: 'ochre', label: 'Ochre', fill: '#f7e4c4', ink: '#1c1b18'},
    {id: 'terra', label: 'Terra', fill: '#f5d7c8', ink: '#1c1b18'},
    {id: 'blue', label: 'Blue', fill: '#d9e6ef', ink: '#1c1b18'},
  ];

const SIZES = [
  {id: 's' as const, width: 2.5, label: 'Fine'},
  {id: 'm' as const, width: 5, label: 'Marker'},
  {id: 'l' as const, width: 10, label: 'Bold'},
];

const NOTE_W = 132;
const NOTE_H = 132;

type WhiteboardCanvasProps = {
  disabled?: boolean;
  onInkChange?: (hasInk: boolean) => void;
};

export type WhiteboardCanvasHandle = {
  exportPng: () => string | null;
  hasInk: () => boolean;
  clear: () => void;
};

function toneFill(tone: StickyTone) {
  return NOTE_TONES.find((t) => t.id === tone)?.fill ?? '#f3efe4';
}

export function WhiteboardCanvas({
  disabled = false,
  onInkChange,
  canvasRef,
}: WhiteboardCanvasProps & {
  canvasRef?: MutableRefObject<WhiteboardCanvasHandle | null>;
}) {
  const uid = useId();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{x: number; y: number} | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const dragNoteRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [color, setColor] = useState<MarkerColor>('#1c1b18');
  const [size, setSize] = useState<(typeof SIZES)[number]['id']>('m');
  const [tool, setTool] = useState<'pen' | 'eraser' | 'note'>('pen');
  const [noteTone, setNoteTone] = useState<StickyTone>('ochre');
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [hasInk, setHasInk] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({x: 0, y: 0, visible: false});
  const notesRef = useRef(notes);
  const hasInkRef = useRef(hasInk);

  notesRef.current = notes;
  hasInkRef.current = hasInk;

  const strokeWidth = SIZES.find((s) => s.id === size)?.width ?? 5;
  const hasContent = hasInk || notes.some((n) => n.text.trim().length > 0);

  const paintBoard = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f7f6f3';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(28, 27, 24, 0.07)';
    for (let x = 16; x < w; x += 24) {
      for (let y = 16; y < h; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const syncSize = useCallback(() => {
    const canvas = canvasElRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;
    const rect = surface.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(360, Math.floor(rect.width * 0.62));
    const prev = canvas.toDataURL('image/png');
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBoard(ctx, w, h);
    if (prev && hasInkRef.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = prev;
    }
  }, [paintBoard]);

  useEffect(() => {
    syncSize();
    const ro = new ResizeObserver(() => syncSize());
    if (surfaceRef.current) ro.observe(surfaceRef.current);
    return () => ro.disconnect();
  }, [syncSize]);

  const markInk = useCallback(
    (next: boolean) => {
      setHasInk(next);
      onInkChange?.(next || notesRef.current.some((n) => n.text.trim()));
    },
    [onInkChange],
  );

  useEffect(() => {
    onInkChange?.(hasInk || notes.some((n) => n.text.trim().length > 0));
  }, [hasInk, notes, onInkChange]);

  const pushHistory = useCallback(() => {
    const canvas = canvasElRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    try {
      historyRef.current.push(
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      );
      if (historyRef.current.length > 40) historyRef.current.shift();
    } catch {
      /* ignore */
    }
  }, []);

  const pointFromEvent = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasElRef.current;
    if (!canvas) return {x: 0, y: 0};
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawSegment = (from: {x: number; y: number}, to: {x: number; y: number}) => {
    const canvas = canvasElRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = strokeWidth * 2.2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.88;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  function placeNoteAt(clientX: number, clientY: number) {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const x = Math.max(
      8,
      Math.min(rect.width - NOTE_W - 8, clientX - rect.left - NOTE_W / 2),
    );
    const y = Math.max(
      8,
      Math.min(rect.height - NOTE_H - 8, clientY - rect.top - NOTE_H / 2),
    );
    const id = `${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotes((prev) => [
      ...prev,
      {id, x, y, text: '', tone: noteTone},
    ]);
    setActiveNoteId(id);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    if (tool === 'note') {
      placeNoteAt(e.clientX, e.clientY);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pushHistory();
    const p = pointFromEvent(e);
    lastPointRef.current = p;
    drawSegment(p, p);
    markInk(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const surface = surfaceRef.current;
    if (surface && (tool === 'pen' || tool === 'eraser')) {
      const rect = surface.getBoundingClientRect();
      setCursor({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      });
    }
    if (!drawingRef.current || disabled || tool === 'note') return;
    const p = pointFromEvent(e);
    const last = lastPointRef.current ?? p;
    drawSegment(last, p);
    lastPointRef.current = p;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onNotePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    note: StickyNote,
  ) {
    if (disabled) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('.aced-wb-note__remove')) return;
    if (target?.closest('.aced-wb-note__input')) return;
    e.stopPropagation();
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    dragNoteRef.current = {
      id: note.id,
      offsetX: e.clientX - rect.left - note.x,
      offsetY: e.clientY - rect.top - note.y,
    };
    setActiveNoteId(note.id);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onNotePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragNoteRef.current;
    const surface = surfaceRef.current;
    if (!drag || !surface || disabled) return;
    const rect = surface.getBoundingClientRect();
    const x = Math.max(
      8,
      Math.min(rect.width - NOTE_W - 8, e.clientX - rect.left - drag.offsetX),
    );
    const y = Math.max(
      8,
      Math.min(rect.height - NOTE_H - 8, e.clientY - rect.top - drag.offsetY),
    );
    setNotes((prev) =>
      prev.map((n) => (n.id === drag.id ? {...n, x, y} : n)),
    );
  }

  function onNotePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragNoteRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function undo() {
    const canvas = canvasElRef.current;
    const ctx = canvas?.getContext('2d');
    const prev = historyRef.current.pop();
    if (!canvas || !ctx || !prev) return;
    ctx.putImageData(prev, 0, 0);
  }

  function clear() {
    pushHistory();
    const canvas = canvasElRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    paintBoard(ctx, canvas.clientWidth, canvas.clientHeight);
    setNotes([]);
    setActiveNoteId(null);
    markInk(false);
  }

  function exportCompositePng(): string | null {
    const canvas = canvasElRef.current;
    if (!canvas) return null;
    const currentNotes = notesRef.current;
    const ink = hasInkRef.current;
    const typed = currentNotes.some((n) => n.text.trim().length > 0);
    if (!ink && !typed && currentNotes.length === 0) return null;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.floor(w));
    out.height = Math.max(1, Math.floor(h));
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, w, h);

    for (const note of currentNotes) {
      const fill = toneFill(note.tone);
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = 'rgba(28, 27, 24, 0.12)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(28, 27, 24, 0.12)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillRect(note.x, note.y, NOTE_W, NOTE_H);
      ctx.shadowColor = 'transparent';
      ctx.strokeRect(note.x + 0.5, note.y + 0.5, NOTE_W - 1, NOTE_H - 1);
      ctx.fillStyle = '#1c1b18';
      ctx.font = '600 13px "Public Sans", ui-sans-serif, system-ui, sans-serif';
      const text = note.text.trim() || '…';
      const lines = wrapText(ctx, text, NOTE_W - 20);
      let ty = note.y + 22;
      for (const line of lines.slice(0, 7)) {
        ctx.fillText(line, note.x + 10, ty);
        ty += 16;
      }
      ctx.restore();
    }

    return out.toDataURL('image/png');
  }

  useEffect(() => {
    if (!canvasRef) return;
    canvasRef.current = {
      exportPng: exportCompositePng,
      hasInk: () =>
        hasInkRef.current ||
        notesRef.current.some((n) => n.text.trim().length > 0),
      clear,
    };
    return () => {
      canvasRef.current = null;
    };
  });

  const surfaceMode =
    tool === 'note' ? 'is-note' : tool === 'eraser' ? 'is-eraser' : 'is-pen';

  return (
    <div className="aced-wb-canvas">
      <div className="aced-wb-canvas__toolbar" role="toolbar" aria-label="Board tools">
        <div className="aced-wb-canvas__group">
          <button
            type="button"
            className={`aced-wb-canvas__tool${tool === 'pen' ? ' is-active' : ''}`}
            disabled={disabled}
            onClick={() => setTool('pen')}
          >
            Marker
          </button>
          <button
            type="button"
            className={`aced-wb-canvas__tool${tool === 'eraser' ? ' is-active' : ''}`}
            disabled={disabled}
            onClick={() => setTool('eraser')}
          >
            Eraser
          </button>
          <button
            type="button"
            className={`aced-wb-canvas__tool${tool === 'note' ? ' is-active' : ''}`}
            disabled={disabled}
            onClick={() => setTool('note')}
          >
            Post-it
          </button>
        </div>

        {tool === 'note' ? (
          <div className="aced-wb-canvas__group" aria-label="Post-it colour">
            {NOTE_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                className={`aced-wb-canvas__swatch${noteTone === tone.id ? ' is-active' : ''}`}
                style={{background: tone.fill}}
                aria-label={`${tone.label} post-it`}
                title={tone.label}
                disabled={disabled}
                onClick={() => setNoteTone(tone.id)}
              />
            ))}
            <Button
              label="Add post-it"
              variant="ghost"
              size="sm"
              isDisabled={disabled}
              onClick={() => {
                const surface = surfaceRef.current;
                if (!surface) return;
                const rect = surface.getBoundingClientRect();
                placeNoteAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
              }}
            />
          </div>
        ) : (
          <>
            <div className="aced-wb-canvas__group">
              {INK_COLORS.map((ink) => (
                <button
                  key={ink.id}
                  type="button"
                  className={`aced-wb-canvas__swatch${color === ink.id && tool === 'pen' ? ' is-active' : ''}`}
                  style={{background: ink.id}}
                  aria-label={`${ink.label} marker`}
                  title={ink.label}
                  disabled={disabled}
                  onClick={() => {
                    setColor(ink.id);
                    setTool('pen');
                  }}
                />
              ))}
            </div>
            <div className="aced-wb-canvas__group">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`aced-wb-canvas__tool${size === s.id ? ' is-active' : ''}`}
                  disabled={disabled}
                  onClick={() => setSize(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="aced-wb-canvas__group">
          <Button
            label="Undo ink"
            variant="ghost"
            size="sm"
            isDisabled={disabled}
            onClick={undo}
          />
          <Button
            label="Clear board"
            variant="ghost"
            size="sm"
            isDisabled={disabled}
            onClick={clear}
          />
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`aced-wb-canvas__surface${disabled ? ' is-disabled' : ''} ${surfaceMode}`}
        onPointerLeave={() => setCursor((c) => ({...c, visible: false}))}
      >
        <canvas
          ref={canvasElRef}
          className="aced-wb-canvas__el"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {notes.map((note) => (
          <div
            key={note.id}
            className={`aced-wb-note aced-wb-note--${note.tone}${activeNoteId === note.id ? ' is-active' : ''}`}
            style={{left: note.x, top: note.y}}
            onPointerDown={(e) => onNotePointerDown(e, note)}
            onPointerMove={onNotePointerMove}
            onPointerUp={onNotePointerUp}
            onPointerCancel={onNotePointerUp}
          >
            <div className="aced-wb-note__chrome">
              <span className="aced-wb-note__grip" aria-hidden="true" />
              {!disabled ? (
                <button
                  type="button"
                  className="aced-wb-note__remove"
                  aria-label="Remove post-it"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setNotes((prev) => prev.filter((n) => n.id !== note.id));
                    if (activeNoteId === note.id) setActiveNoteId(null);
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
            <textarea
              className="aced-wb-note__input"
              value={note.text}
              disabled={disabled}
              placeholder="Type a note…"
              maxLength={160}
              rows={5}
              onPointerDown={(e) => e.stopPropagation()}
              onFocus={() => setActiveNoteId(note.id)}
              onChange={(e) => {
                const value = e.target.value;
                setNotes((prev) =>
                  prev.map((n) =>
                    n.id === note.id ? {...n, text: value} : n,
                  ),
                );
              }}
            />
          </div>
        ))}

        {cursor.visible && !disabled && tool !== 'note' ? (
          <span
            className={`aced-wb-canvas__cursor aced-wb-canvas__cursor--${tool}`}
            style={{
              left: cursor.x,
              top: cursor.y,
              ['--marker-color' as string]: color,
              ['--marker-size' as string]: `${strokeWidth}px`,
            }}
            aria-hidden="true"
          />
        ) : null}

        <p className="aced-wb-canvas__hint">
          {tool === 'note'
            ? 'Click the board to drop a post-it · drag to place · type to label'
            : hasContent
              ? 'Marker + post-its. Sketch flows, label concepts'
              : 'Hover for the marker · or switch to Post-it for typed notes'}
        </p>
      </div>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
