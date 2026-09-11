"use client";

import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { Eraser, Keyboard } from "lucide-react";

type Props = {
  value: string;
  printedName: string;
  onChange: (value: string, mode: "drawn" | "typed-accessible") => void;
};

export function SignaturePad({ value, printedName, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [typedMode, setTypedMode] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || value) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
  }, [value]);

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = position(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = "#171F32";
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = position(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finish() {
    if (!drawing.current || !canvasRef.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL("image/png"), "drawn");
  }

  function clear() {
    const canvas = canvasRef.current;
    if (canvas)
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange("", typedMode ? "typed-accessible" : "drawn");
  }

  function useTyped() {
    setTypedMode(true);
    if (!printedName.trim()) return onChange("", "typed-accessible");
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 220;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#171F32";
    context.font = "italic 68px Georgia, serif";
    context.fillText(printedName.trim(), 40, 135, 820);
    onChange(canvas.toDataURL("image/png"), "typed-accessible");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white focus-within:border-brand-red">
        {typedMode && value ? (
          <div className="flex h-40 items-center justify-center px-6 font-serif text-3xl italic text-brand-ink sm:text-4xl">
            {printedName}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            aria-label="Draw your signature"
            className="h-40 w-full touch-none cursor-crosshair"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
          />
        )}
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Sign above using your finger, mouse, or stylus.
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-red"
        >
          <Eraser className="h-4 w-4" /> Clear signature
        </button>
        <button
          type="button"
          onClick={useTyped}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-red"
        >
          <Keyboard className="h-4 w-4" /> Accessible typed alternative
        </button>
      </div>
    </div>
  );
}
