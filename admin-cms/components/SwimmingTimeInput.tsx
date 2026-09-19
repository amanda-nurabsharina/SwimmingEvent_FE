"use client";

import React, { useState, useEffect, useRef } from "react";

export interface SwimmingTimeInputProps {
  value?: string; // e.g. "02.29.50", "00:28.14", "99.99.99"
  onChange: (value: string) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabels?: boolean;
}

export default function SwimmingTimeInput({
  value = "00.00.00",
  onChange,
  onEnter,
  onEscape,
  disabled = false,
  autoFocus = false,
  size = "md",
  className = "",
  showLabels = false,
}: SwimmingTimeInputProps) {
  const mmRef = useRef<HTMLInputElement>(null);
  const ssRef = useRef<HTMLInputElement>(null);
  const msRef = useRef<HTMLInputElement>(null);

  // Parse incoming value into mm, ss, ms
  const parseVal = (v?: string) => {
    if (!v || v === "-" || v.toUpperCase() === "NT") {
      return { mm: "00", ss: "00", ms: "00" };
    }
    const clean = v.trim().replace(/:/g, ".");
    const parts = clean.split(".");
    if (parts.length >= 3) {
      return {
        mm: parts[0].replace(/\D/g, "").padStart(2, "0").slice(-2),
        ss: parts[1].replace(/\D/g, "").padStart(2, "0").slice(-2),
        ms: parts[2].replace(/\D/g, "").padStart(2, "0").slice(-2),
      };
    } else if (parts.length === 2) {
      return {
        mm: "00",
        ss: parts[0].replace(/\D/g, "").padStart(2, "0").slice(-2),
        ms: parts[1].replace(/\D/g, "").padStart(2, "0").slice(-2),
      };
    }
    return { mm: "00", ss: "00", ms: "00" };
  };

  const initial = parseVal(value);
  const [mm, setMm] = useState<string>(initial.mm);
  const [ss, setSs] = useState<string>(initial.ss);
  const [ms, setMs] = useState<string>(initial.ms);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync state if external value changes significantly
  useEffect(() => {
    const parsed = parseVal(value);
    setMm(parsed.mm);
    setSs(parsed.ss);
    setMs(parsed.ms);
  }, [value]);

  // Autofocus on mount if requested
  useEffect(() => {
    if (autoFocus && mmRef.current) {
      mmRef.current.focus();
      mmRef.current.select();
    }
  }, [autoFocus]);

  const emitChange = (newMm: string, newSs: string, newMs: string) => {
    const pad = (s: string) => (s ? s.padStart(2, "0") : "00");
    const formatted = `${pad(newMm)}.${pad(newSs)}.${pad(newMs)}`;
    onChange(formatted);
  };

  const handleMmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMm(digits);
    emitChange(digits, ss, ms);
    if (digits.length === 2 && ssRef.current) {
      ssRef.current.focus();
      ssRef.current.select();
    }
  };

  const handleSsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
    setSs(digits);
    emitChange(mm, digits, ms);
    if (digits.length === 2 && msRef.current) {
      msRef.current.focus();
      msRef.current.select();
    }
  };

  const handleMsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMs(digits);
    emitChange(mm, ss, digits);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const pad = (s: string) => (s ? s.padStart(2, "0") : "00");
    const finalMm = pad(mm);
    const finalSs = pad(ss);
    const finalMs = pad(ms);
    setMm(finalMm);
    setSs(finalSs);
    setMs(finalMs);
    onChange(`${finalMm}.${finalSs}.${finalMs}`);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "mm" | "ss" | "ms"
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onEscape?.();
    } else if (e.key === "." || e.key === ":") {
      e.preventDefault();
      if (field === "mm" && ssRef.current) {
        ssRef.current.focus();
        ssRef.current.select();
      } else if (field === "ss" && msRef.current) {
        msRef.current.focus();
        msRef.current.select();
      }
    } else if (e.key === "Backspace") {
      if (field === "ms" && !ms && ssRef.current) {
        e.preventDefault();
        ssRef.current.focus();
        ssRef.current.select();
      } else if (field === "ss" && !ss && mmRef.current) {
        e.preventDefault();
        mmRef.current.focus();
        mmRef.current.select();
      }
    } else if (e.key === "ArrowRight") {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        if (field === "mm" && ssRef.current) {
          e.preventDefault();
          ssRef.current.focus();
          ssRef.current.select();
        } else if (field === "ss" && msRef.current) {
          e.preventDefault();
          msRef.current.focus();
          msRef.current.select();
        }
      }
    } else if (e.key === "ArrowLeft") {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        if (field === "ms" && ssRef.current) {
          e.preventDefault();
          ssRef.current.focus();
          ssRef.current.select();
        } else if (field === "ss" && mmRef.current) {
          e.preventDefault();
          mmRef.current.focus();
          mmRef.current.select();
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim().replace(/:/g, ".");
    let parsed = { mm: "00", ss: "00", ms: "00" };

    if (text.includes(".")) {
      const parts = text.split(".");
      if (parts.length >= 3) {
        parsed = {
          mm: parts[0].replace(/\D/g, "").padStart(2, "0").slice(-2),
          ss: parts[1].replace(/\D/g, "").padStart(2, "0").slice(-2),
          ms: parts[2].replace(/\D/g, "").padStart(2, "0").slice(-2),
        };
      } else if (parts.length === 2) {
        parsed = {
          mm: "00",
          ss: parts[0].replace(/\D/g, "").padStart(2, "0").slice(-2),
          ms: parts[1].replace(/\D/g, "").padStart(2, "0").slice(-2),
        };
      }
    } else {
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 6) {
        parsed = {
          mm: digits.slice(0, 2),
          ss: digits.slice(2, 4),
          ms: digits.slice(4, 6),
        };
      } else if (digits.length >= 4) {
        parsed = {
          mm: "00",
          ss: digits.slice(0, 2),
          ms: digits.slice(2, 4),
        };
      }
    }

    setMm(parsed.mm);
    setSs(parsed.ss);
    setMs(parsed.ms);
    onChange(`${parsed.mm}.${parsed.ss}.${parsed.ms}`);
  };

  // Dimensions & font sizing based on prop
  const isSm = size === "sm";
  const boxHeight = isSm ? "h-8" : "h-10";
  const inputWidth = isSm ? "w-6" : "w-8";
  const textSize = isSm ? "text-xs" : "text-sm";

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div
        className={`inline-flex items-center justify-center font-mono font-black transition-all ${boxHeight} ${
          disabled
            ? "bg-slate-100 border-2 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
            : isFocused
            ? "bg-white border-2 border-sky-500 ring-2 ring-sky-100 shadow-sm text-slate-900"
            : "bg-white border-2 border-sky-400 hover:border-sky-500 shadow-xs text-slate-900"
        } rounded-2xl px-2.5 py-0.5 select-none`}
        onPaste={disabled ? undefined : handlePaste}
      >
        {/* MM (Menit) */}
        <input
          ref={mmRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          disabled={disabled}
          value={mm}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={handleMmChange}
          onKeyDown={(e) => handleKeyDown(e, "mm")}
          placeholder="00"
          className={`${inputWidth} ${textSize} text-center bg-transparent font-black tracking-tight focus:outline-none disabled:cursor-not-allowed focus:bg-sky-50/70 rounded`}
          title="Menit (00-59)"
        />

        <span className={`px-0.5 font-black text-sky-600 select-none ${isSm ? "text-xs" : "text-sm"}`}>
          .
        </span>

        {/* SS (Detik) */}
        <input
          ref={ssRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          disabled={disabled}
          value={ss}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={handleSsChange}
          onKeyDown={(e) => handleKeyDown(e, "ss")}
          placeholder="00"
          className={`${inputWidth} ${textSize} text-center bg-transparent font-black tracking-tight focus:outline-none disabled:cursor-not-allowed focus:bg-sky-50/70 rounded`}
          title="Detik (00-59)"
        />

        <span className={`px-0.5 font-black text-sky-600 select-none ${isSm ? "text-xs" : "text-sm"}`}>
          .
        </span>

        {/* ms (Ratusan Detik / Milidetik) */}
        <input
          ref={msRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          disabled={disabled}
          value={ms}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={handleMsChange}
          onKeyDown={(e) => handleKeyDown(e, "ms")}
          placeholder="00"
          className={`${inputWidth} ${textSize} text-center bg-transparent font-black tracking-tight focus:outline-none disabled:cursor-not-allowed focus:bg-sky-50/70 rounded`}
          title="1/100 Detik (00-99)"
        />
      </div>

      {showLabels && (
        <div className="flex items-center justify-between w-full px-3 mt-1 text-[9px] font-black uppercase text-slate-400">
          <span>Menit</span>
          <span>Detik</span>
          <span>1/100s</span>
        </div>
      )}
    </div>
  );
}
