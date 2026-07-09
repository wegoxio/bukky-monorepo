'use client';

import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ColorPickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

type HslColor = {
  h: number;
  s: number;
  l: number;
};

type InputMode = 'HEX' | 'RGB' | 'HSL';

const HEX_COLOR_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HUE_STRIP =
  'linear-gradient(90deg, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)';
const INPUT_MODES: InputMode[] = ['HEX', 'RGB', 'HSL'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseHexValue(value: string | undefined | null): string | null {
  if (!value) return null;

  const normalized = value.trim();
  const match = HEX_COLOR_REGEX.exec(normalized);
  if (!match) return null;

  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }

  return `#${hex}`;
}

function normalizeHex(value: string | undefined | null, fallback = '#000000') {
  return parseHexValue(value) ?? fallback;
}

function hexToRgb(value: string) {
  const hex = normalizeHex(value);
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const channelToHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function rgbToHsv(value: string): HsvColor {
  const { r, g, b } = hexToRgb(value);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  const normalizedHue = Math.round(hue * 60);
  const saturation = max === 0 ? 0 : (delta / max) * 100;
  const valueChannel = max * 100;

  return {
    h: normalizedHue < 0 ? normalizedHue + 360 : normalizedHue,
    s: saturation,
    v: valueChannel,
  };
}

function hsvToHex({ h, s, v }: HsvColor) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const brightness = clamp(v, 0, 100) / 100;
  const chroma = brightness * saturation;
  const huePrime = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = brightness - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}

function rgbToHsl(value: string): HslColor {
  const { r, g, b } = hexToRgb(value);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: hue < 0 ? hue * 60 + 360 : hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hslToHex({ h, s, l }: HslColor) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return rgbToHex((red + match) * 255, (green + match) * 255, (blue + match) * 255);
}

function ChannelInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <input
        type="number"
        min={min}
        max={max}
        value={Math.round(value)}
        onChange={(event) => {
          if (event.target.value === '') return;
          const nextValue = Number(event.target.value);
          if (Number.isNaN(nextValue)) return;
          onCommit(clamp(nextValue, min, max));
        }}
        className="h-10 w-full rounded-xl border border-card-border bg-surface px-3 text-center text-sm font-medium text-fg-strong outline-none transition focus:border-accent"
      />
      <span className="block text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
    </label>
  );
}

export default function ColorPickerField({
  value,
  onChange,
  disabled = false,
  className = '',
  ariaLabel = 'Editar color',
}: ColorPickerFieldProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('HEX');
  const [hexInput, setHexInput] = useState('');
  const boardRef = useRef<HTMLDivElement | null>(null);

  const normalizedValue = useMemo(() => normalizeHex(value), [value]);
  const currentHsv = useMemo(() => rgbToHsv(normalizedValue), [normalizedValue]);
  const currentRgb = useMemo(() => hexToRgb(normalizedValue), [normalizedValue]);
  const currentHsl = useMemo(() => rgbToHsl(normalizedValue), [normalizedValue]);

  useEffect(() => {
    setHexInput(normalizedValue);
  }, [normalizedValue]);

  const triggerValue = useMemo(() => {
    if (inputMode === 'RGB') {
      return `${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b}`;
    }

    if (inputMode === 'HSL') {
      return `${Math.round(currentHsl.h)} ${Math.round(currentHsl.s)}% ${Math.round(currentHsl.l)}%`;
    }

    return normalizedValue;
  }, [
    currentHsl.h,
    currentHsl.l,
    currentHsl.s,
    currentRgb.b,
    currentRgb.g,
    currentRgb.r,
    inputMode,
    normalizedValue,
  ]);

  const commitHexInput = () => {
    const parsed = parseHexValue(hexInput);
    if (!parsed) {
      setHexInput(normalizedValue);
      return;
    }

    onChange(parsed);
    setHexInput(parsed);
  };

  const updateSaturationValue = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const saturation = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const valueChannel = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);

    onChange(
      hsvToHex({
        h: currentHsv.h,
        s: saturation,
        v: valueChannel,
      }),
    );
  };

  const handleBoardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    event.preventDefault();
    updateSaturationValue(event.clientX, event.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateSaturationValue(moveEvent.clientX, moveEvent.clientY);
    };

    const stopTracking = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopTracking);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopTracking);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={`inline-flex w-full items-center gap-2.5 rounded-xl border border-card-border bg-surface-soft px-2.5 py-2 text-left transition hover:bg-surface disabled:opacity-60 ${className}`.trim()}
        >
          <span
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-card-border"
            style={{ backgroundColor: normalizedValue }}
          >
            <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.35),transparent_60%)]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Color activo
            </span>
            <span className="mt-1 block truncate text-sm font-semibold text-fg-strong">
              {triggerValue}
            </span>
          </span>
          <span className="rounded-full border border-card-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {inputMode}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-icon" />
        </button>
      </Popover.Trigger>

      {isOpen ? (
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={10}
            collisionPadding={12}
            className="z-[90] w-[284px] rounded-[20px] border border-card-border bg-surface p-2.5 shadow-theme-card"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-9 w-9 shrink-0 rounded-full border border-card-border"
                  style={{ backgroundColor: normalizedValue }}
                />
                <div className="grid flex-1 grid-cols-3 gap-1 rounded-full border border-card-border bg-surface-soft p-1">
                  {INPUT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setInputMode(mode)}
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                        inputMode === mode
                          ? 'bg-accent text-accent-text shadow-theme-accent-sm'
                          : 'text-muted hover:bg-surface'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={boardRef}
                onPointerDown={handleBoardPointerDown}
                className="relative h-36 w-full cursor-crosshair overflow-hidden rounded-2xl border border-card-border"
                style={{
                  backgroundColor: hsvToHex({ h: currentHsv.h, s: 100, v: 100 }),
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff,rgba(255,255,255,0))]" />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,#000000,rgba(0,0,0,0))]" />
                <span
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.18)]"
                  style={{
                    left: `${currentHsv.s}%`,
                    top: `${100 - currentHsv.v}%`,
                    backgroundColor: normalizedValue,
                  }}
                />
              </div>

              <div className="rounded-2xl border border-card-border bg-surface-soft p-2.5">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  <span>Tono</span>
                  <span>{Math.round(currentHsv.h)}deg</span>
                </div>
                <div className="relative h-3">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundImage: HUE_STRIP }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={Math.round(currentHsv.h)}
                    onChange={(event) =>
                      onChange(
                        hsvToHex({
                          h: Number(event.target.value),
                          s: currentHsv.s,
                          v: currentHsv.v,
                        }),
                      )
                    }
                    className="color-picker-range absolute inset-0 h-full w-full appearance-none bg-transparent"
                    aria-label="Ajustar tono"
                  />
                </div>
              </div>

              {inputMode === 'HEX' ? (
                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    HEX
                  </span>
                  <input
                    value={hexInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setHexInput(nextValue);

                      const parsed = parseHexValue(nextValue);
                      if (parsed) {
                        onChange(parsed);
                      }
                    }}
                    onBlur={commitHexInput}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitHexInput();
                      }
                    }}
                    placeholder="#000000"
                    spellCheck={false}
                    className="h-10 w-full rounded-xl border border-card-border bg-surface px-3 text-sm font-medium text-fg-strong outline-none transition focus:border-accent placeholder:text-fg-placeholder"
                  />
                </label>
              ) : inputMode === 'RGB' ? (
                <div className="grid grid-cols-3 gap-2">
                  <ChannelInput
                    label="R"
                    value={currentRgb.r}
                    min={0}
                    max={255}
                    onCommit={(nextValue) =>
                      onChange(rgbToHex(nextValue, currentRgb.g, currentRgb.b))
                    }
                  />
                  <ChannelInput
                    label="G"
                    value={currentRgb.g}
                    min={0}
                    max={255}
                    onCommit={(nextValue) =>
                      onChange(rgbToHex(currentRgb.r, nextValue, currentRgb.b))
                    }
                  />
                  <ChannelInput
                    label="B"
                    value={currentRgb.b}
                    min={0}
                    max={255}
                    onCommit={(nextValue) =>
                      onChange(rgbToHex(currentRgb.r, currentRgb.g, nextValue))
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <ChannelInput
                    label="H"
                    value={currentHsl.h}
                    min={0}
                    max={360}
                    onCommit={(nextValue) =>
                      onChange(
                        hslToHex({
                          h: nextValue,
                          s: currentHsl.s,
                          l: currentHsl.l,
                        }),
                      )
                    }
                  />
                  <ChannelInput
                    label="S"
                    value={currentHsl.s}
                    min={0}
                    max={100}
                    onCommit={(nextValue) =>
                      onChange(
                        hslToHex({
                          h: currentHsl.h,
                          s: nextValue,
                          l: currentHsl.l,
                        }),
                      )
                    }
                  />
                  <ChannelInput
                    label="L"
                    value={currentHsl.l}
                    min={0}
                    max={100}
                    onCommit={(nextValue) =>
                      onChange(
                        hslToHex({
                          h: currentHsl.h,
                          s: currentHsl.s,
                          l: nextValue,
                        }),
                      )
                    }
                  />
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  );
}
