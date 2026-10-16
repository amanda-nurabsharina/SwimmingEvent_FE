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
  dataRegId?: number | string;
}

// Convert any incoming time format (e.g. "01.25.43", "28.14", "01:25.43") into clean digits string (max 6 digits)
function extractDigits(val?: string): string {
  if (!val || val === "-" || val.toUpperCase() === "NT") return "";
  const clean = val.trim().replace(/:/g, ".");
  const parts = clean.split(".");
  if (parts.length === 2) {
    const s = parts[0].replace(/\D/g, "").slice(0, 2);
    const ms = parts[1].replace(/\D/g, "").slice(0, 2);
    const combined = `00${s.padStart(2, "0")}${ms.padEnd(2, "0")}`;
    const num = combined.replace(/^0+/, "");
    return num || "";
  } else if (parts.length >= 3) {
    const m = parts[0].replace(/\D/g, "").slice(0, 2);
    const s = parts[1].replace(/\D/g, "").slice(0, 2);
    const ms = parts[2].replace(/\D/g, "").slice(0, 2);
    const combined = `${m.padStart(2, "0")}${s.padStart(2, "0")}${ms.padEnd(2, "0")}`;
    const num = combined.replace(/^0+/, "");
    return num || "";
  }
  const onlyDigits = val.replace(/\D/g, "").slice(0, 6);
  return onlyDigits.replace(/^0+/, "");
}

// Format digits into fixed MM.SS.MS format with static dots (e.g. "2814" -> "00.28.14")
function formatDigits(digits: string): string {
  if (!digits) return "00.00.00";
  const padded = digits.padStart(6, "0").slice(-6);
  const mm = padded.slice(0, 2);
  const ss = padded.slice(2, 4);
  const ms = padded.slice(4, 6);
  return `${mm}.${ss}.${ms}`;
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
  dataRegId,
}: SwimmingTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [digits, setDigits] = useState<string>(() => extractDigits(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [shouldReplace, setShouldReplace] = useState<boolean>(true);

  // Sync state if external value changes while NOT focused
  useEffect(() => {
    if (isFocused) return;
    setDigits(extractDigits(value));
    setShouldReplace(true);
  }, [value, isFocused]);

  // Autofocus and select on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const displayValue = formatDigits(digits);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setShouldReplace(true);
    e.target.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    setShouldReplace(true);
    onChange(formatDigits(digits));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onEscape?.();
      return;
    }
    if (
      e.key === "Tab" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      setShouldReplace(false);
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      if (shouldReplace) {
        setDigits("");
        setShouldReplace(false);
        onChange("00.00.00");
        return;
      }
      const nextDigits = digits.slice(0, -1);
      setDigits(nextDigits);
      onChange(formatDigits(nextDigits));
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      setDigits("");
      setShouldReplace(false);
      onChange("00.00.00");
      return;
    }

    if (e.key === "." || e.key === ":") {
      e.preventDefault();
      setShouldReplace(false);
      if (digits.length > 0 && digits.length <= 2) {
        // User typed seconds (e.g. "28"), shift to seconds column
        const nextDigits = digits + "00";
        setDigits(nextDigits);
        onChange(formatDigits(nextDigits));
      }
      return;
    }

    // Only allow numeric digits 0-9
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      let nextDigits = digits;
      if (shouldReplace) {
        nextDigits = e.key === "0" ? "" : e.key;
        setShouldReplace(false);
      } else {
        if (nextDigits.length >= 6) return;
        nextDigits = (nextDigits + e.key).replace(/^0+/, "");
      }
      setDigits(nextDigits);
      onChange(formatDigits(nextDigits));
      return;
    }

    // Block any other key to enforce strict numeric entry
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const extracted = extractDigits(text);
    setDigits(extracted);
    setShouldReplace(false);
    onChange(formatDigits(extracted));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const extracted = extractDigits(raw);
    setDigits(extracted);
    setShouldReplace(false);
    onChange(formatDigits(extracted));
  };

  // Dimensions based on prop
  const isSm = size === "sm";
  const isLg = size === "lg";
  const boxHeight = isSm ? "h-8" : isLg ? "h-11" : "h-10";
  const boxWidth = isSm ? "w-28" : isLg ? "w-36" : "w-32";
  const textSize = isSm ? "text-xs" : isLg ? "text-base" : "text-sm";

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={displayValue}
        data-reg-id={dataRegId}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={disabled ? undefined : handlePaste}
        placeholder="00.00.00"
        title="Input catatan waktu lomba (Format 00.00.00 - Ketik angka saja)"
        className={`${boxWidth} ${boxHeight} ${textSize} text-center font-mono font-black tracking-widest transition-all rounded-xl select-all ${
          disabled
            ? "bg-slate-100 border-2 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
            : isFocused
            ? "bg-white border-2 border-sky-500 ring-2 ring-sky-200 text-sky-950 shadow-sm"
            : "bg-sky-50/40 border-2 border-sky-300 hover:border-sky-400 text-slate-800 shadow-2xs"
        } focus:outline-none`}
      />

      {showLabels && (
        <div className="flex items-center justify-between w-full px-2 mt-1 text-[9px] font-black uppercase text-slate-400 tracking-wider">
          <span>Menit</span>
          <span>Detik</span>
          <span>1/100s</span>
        </div>
      )}
    </div>
  );
}
