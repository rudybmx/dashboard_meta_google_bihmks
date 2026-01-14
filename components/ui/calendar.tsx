import {
  addDays,
  addMonths, endOfDay,
  endOfMonth,
  endOfWeek, format, isEqual,
  isSameDay,
  isSameMonth, isToday,
  isValid,
  isWithinInterval, parse, startOfDay,
  startOfMonth,
  startOfWeek, sub,
  subDays, subHours, subMinutes,
  subMonths,
  subWeeks, subYears
} from "date-fns";
import React, { useEffect, useMemo, useRef, useState } from "react";
// Adjust paths based on where you placed the dependencies
import { Button } from "@/components/ui/button-1"; 
import { Material } from "@/components/ui/material-1";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select-1";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useClickOutside } from "@/components/ui/use-click-outside";
import clsx from "clsx";
import { ptBR } from "date-fns/locale"; // CHANGED: Locale PT-BR
import { twMerge } from "tailwind-merge";

// ... (Keep Icon Components ClockIcon, ArrowBottomIcon, etc. EXACTLY AS ORIGINAL) ...
const ClockIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8ZM16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM8.75 4.75V4H7.25V4.75V7.875C7.25 8.18976 7.39819 8.48615 7.65 8.675L9.55 10.1L10.15 10.55L11.05 9.35L10.45 8.9L8.75 7.625V4.75Z" className="fill-gray-1000"/></svg>);
const ArrowBottomIcon = ({ className }: { className?: string }) => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16" className={clsx("fill-gray-1000", className)}><path fillRule="evenodd" clipRule="evenodd" d="M14.0607 5.49999L13.5303 6.03032L8.7071 10.8535C8.31658 11.2441 7.68341 11.2441 7.29289 10.8535L2.46966 6.03032L1.93933 5.49999L2.99999 4.43933L3.53032 4.96966L7.99999 9.43933L12.4697 4.96966L13 4.43933L14.0607 5.49999Z"/></svg>);
const ArrowLeftIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M10.5 14.0607L9.96966 13.5303L5.14644 8.7071C4.75592 8.31658 4.75592 7.68341 5.14644 7.29289L9.96966 2.46966L10.5 1.93933L11.5607 2.99999L11.0303 3.53032L6.56065 7.99999L11.0303 12.4697L11.5607 13L10.5 14.0607Z" className="fill-gray-700"/></svg>);
const ArrowRightIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M5.50001 1.93933L6.03034 2.46966L10.8536 7.29288C11.2441 7.68341 11.2441 8.31657 10.8536 8.7071L6.03034 13.5303L5.50001 14.0607L4.43935 13L4.96968 12.4697L9.43935 7.99999L4.96968 3.53032L4.43935 2.99999L5.50001 1.93933Z" className="fill-gray-700"/></svg>);
const CalendarIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M5.5 0.5V1.25V2H10.5V1.25V0.5H12V1.25V2H14H15.5V3.5V13.5C15.5 14.8807 14.3807 16 13 16H3C1.61929 16 0.5 14.8807 0.5 13.5V3.5V2H2H4V1.25V0.5H5.5ZM2 3.5H14V6H2V3.5ZM2 7.5V13.5C2 14.0523 2.44772 14.5 3 14.5H13C13.5523 14.5 14 14.0523 14 13.5V7.5H2Z"/></svg>);
const ClearIcon = () => (<svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16"><path fillRule="evenodd" clipRule="evenodd" d="M12.4697 13.5303L13 14.0607L14.0607 13L13.5303 12.4697L9.06065 7.99999L13.5303 3.53032L14.0607 2.99999L13 1.93933L12.4697 2.46966L7.99999 6.93933L3.53032 2.46966L2.99999 1.93933L1.93933 2.99999L2.46966 3.53032L6.93933 7.99999L2.46966 12.4697L1.93933 13L2.99999 14.0607L3.53032 13.5303L7.99999 9.06065L12.4697 13.5303Z"/></svg>);

// --- TRANSLATION & HELPERS ---

const parseRelativeDate = (input: string) => {
  // Simple regex for portuguese "X dias", "X semanas"
  const regex = /(\d+)\s*(dia|semana|mês|ano|hora)s?/i;
  const match = input.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1]);
  const unitStr = match[2].toLowerCase();
  
  // Map PT to EN units for date-fns
  const unitMap: Record<string, string> = {
      'dia': 'days',
      'semana': 'weeks',
      'mês': 'months',
      'ano': 'years',
      'hora': 'hours'
  };
  
  const unit = unitMap[unitStr] || unitMap[unitStr.slice(0, -1)]; // handle singular/plural roughly

  if (!unit) return null;

  const now = new Date();
  const start = startOfDay(sub(now, { [unit]: value }));
  const end = endOfDay(now);

  return {
    [input]: { text: input, start, end }
  };
};

const parseFixedRange = (input: string) => {
  const rangePattern = /(.+)\s*[-–]\s*(.+)/;
  const match = input.match(rangePattern);
  if (!match) return parseExactDate(input);

  const [, startStr, endStr] = match;
  if (!startStr || !endStr) return null;

  const possibleFormats = ["d MMM yyyy", "d MMM", "yyyy-MM-dd", "dd/MM/yyyy"];

  for (const formatStr of possibleFormats) {
    const now = new Date();
    const year = now.getFullYear();

    const start = parse(startStr, formatStr, now, { locale: ptBR });
    const end = parse(endStr, formatStr, now, { locale: ptBR });

    const finalStart = isValid(start) ? startOfDay(start) : null;
    const finalEnd = isValid(end) ? endOfDay(end) : null;

    if (finalStart && finalEnd) {
      if (formatStr === "d MMM") {
        finalStart.setFullYear(year);
        finalEnd.setFullYear(year);
      }
      return {
        [input]: { text: input, start: finalStart, end: finalEnd }
      };
    }
  }
  return null;
};

const parseExactDate = (input: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateFormats = ["d MMM yyyy", "d MMM", "yyyy-MM-dd", "dd/MM/yyyy"];

  for (const formatStr of dateFormats) {
    let date = parse(input.trim(), formatStr, now, { locale: ptBR });

    if (isValid(date)) {
      if (formatStr === "d MMM") {
        date.setFullYear(currentYear);
      }
      return {
        [input]: {
          text: input,
          start: startOfDay(date),
          end: endOfDay(date)
        }
      };
    }
  }
  return null;
};

const parseDateInput = (input: string) => {
  const relative = parseRelativeDate(input);
  if (relative) return relative;
  const fixedRange = parseFixedRange(input);
  if (fixedRange) return fixedRange;
  const exact = parseExactDate(input);
  if (exact) return exact;
  return null;
};

const filterPresets = (obj: Record<string, any>, search: string) => {
  if (!search) return obj;
  const searchWords = search.toLowerCase().split("-").filter(Boolean);
  const filtered = Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => {
      const keyLower = value.text.toLowerCase();
      return searchWords.every(word => keyLower.includes(word));
    })
  );
  if (Object.entries(filtered).length > 0) return filtered;

  const parsed = parseDateInput(search);
  if (parsed) return parsed;

  return {};
};

const formatDateRange = (start: Date, end: Date, timezone: string) => {
  // Helper to format with locale
  const formatTz = (date: Date, fmt: string) => formatInTimeZone(date, timezone, fmt, { locale: ptBR });

  const isStartMidnight = isEqual(start, startOfDay(start));
  const isEndEOD = isEqual(end, endOfDay(end));
  const sameDay = isSameDay(start, end);

  if (sameDay) {
    return formatTz(start, isStartMidnight ? "EEE, d MMM" : "EEE, d MMM, HH:mm");
  }

  const sameMonth = formatTz(start, "MMM") === formatTz(end, "MMM") && formatTz(start, "yy") === formatTz(end, "yy");
  const sameYear = formatTz(start, "yy") === formatTz(end, "yy");

  const startHasTime = !isStartMidnight;
  const endHasTime = !isEndEOD;

  if (startHasTime || endHasTime) {
    return `${formatTz(start, startHasTime ? "d MMM, HH:mm" : "d MMM")} - ${formatTz(end, endHasTime ? "d MMM, HH:mm" : "d MMM")}`;
  }

  if (sameMonth) {
    return `${formatTz(start, "MMM")} ${formatTz(start, "d")} - ${formatTz(end, "d")}`;
  }
  if (sameYear) {
    return `${formatTz(start, "d MMM")} - ${formatTz(end, "d MMM")}`;
  }
  return `${formatTz(start, "d MMM yy")} - ${formatTz(end, "d MMM yy")}`;
};

// --- TRANSLATED PRESETS ---
const typeRelativeTimes = [
  { text: "Hoje", start: startOfDay(new Date()), end: endOfDay(new Date()) },
  { text: "Ontem", start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) },
  { text: "Últimos 7 dias", start: startOfDay(subDays(new Date(), 7)), end: endOfDay(new Date()) },
  { text: "Últimos 14 dias", start: startOfDay(subDays(new Date(), 14)), end: endOfDay(new Date()) },
  { text: "Últimos 30 dias", start: startOfDay(subDays(new Date(), 30)), end: endOfDay(new Date()) },
  { text: "Este Mês", start: startOfMonth(new Date()), end: endOfDay(new Date()) },
  { text: "Mês Passado", start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }
];

interface CalendarComboboxProps {
  stacked: boolean;
  compact: boolean;
  value: RangeValue | null;
  onChange: (date: RangeValue | null) => void;
  presets: { [key: string]: { text: string; start: Date; end: Date } };
  presetIndex?: number;
}

const CalendarCombobox = ({ stacked, compact, value, onChange, presets, presetIndex }: CalendarComboboxProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [currentPreset, setCurrentPreset] = useState<any | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const onFocus = () => setIsOpen(true);
  const onChangeInputValue = (value: string) => setInputValue(value);
  const onClick = (value: any) => {
    setInputValue(value.text);
    setCurrentPreset(value);
    onChange({ start: value.start, end: value.end });
    setIsOpen(false);
  };

  const filteredPresets = filterPresets(presets, inputValue);
  useClickOutside(ref, () => setIsOpen(false));

  useEffect(() => {
    const array = Object.entries(presets);
    if (presetIndex !== undefined && presetIndex >= 0 && presetIndex < array.length) {
      setInputValue(array[presetIndex][1].text);
      setCurrentPreset(array[presetIndex][1]);
      onChange({ start: array[presetIndex][1].start, end: array[presetIndex][1].end });
    }
  }, [presetIndex]);

  useEffect(() => {
    if (currentPreset) {
      if (currentPreset.start !== value?.start || currentPreset.end !== value?.end) {
        setCurrentPreset(null);
        setInputValue("");
      }
    }
  }, [value]);

  return (
    <div ref={ref} className={twMerge(clsx("inline-block text-sm font-sans", compact ? "w-[180px] absolute left-[38px]" : "w-[250px] relative", compact && !isOpen && "pl-[140px]", compact && (isOpen || (currentPreset && currentPreset?.start === value?.start && currentPreset?.end === value?.end)) && "pl-0"))}>
      <Input
        prefix={compact ? undefined : <ClockIcon />}
        prefixStyling={"pl-2.5"}
        suffix={<ArrowBottomIcon className={clsx("duration-200", isOpen && "rotate-180")} />}
        suffixStyling={clsx("cursor-pointer", compact && !isOpen && (!currentPreset || (currentPreset?.start !== value?.start && currentPreset?.end !== value?.end)) && "w-10 !px-0")}
        placeholder="Selecione o Período"
        onFocus={onFocus}
        value={inputValue}
        onChange={onChangeInputValue}
        wrapperClassName={clsx("hover:z-10", stacked && !compact && "rounded-b-none", !stacked && !compact && "rounded-r-none", compact && "rounded-l-none", (isOpen || (compact && currentPreset && currentPreset?.start === value?.start && currentPreset?.end === value?.end)) && "z-10")}
        className={clsx("pl-2 placeholder:!text-gray-1000 placeholder:!opacity-100", compact && !isOpen && (!currentPreset || (currentPreset?.start !== value?.start && currentPreset?.end !== value?.end)) && "!w-0 !px-0")}
      />
      <Material type="menu" className={clsx("absolute z-50 top-12 left-0", compact ? "w-full" : "grid grid-cols-2 w-[200%]", isOpen && "opacity-100", !isOpen && "opacity-0 pointer-events-none duration-200")}>
        <ul className="p-2 border-r border-r-gray-200">
          {Object.entries(filteredPresets).length > 0 ? Object.entries(filteredPresets).map(([key, value]) => (
            <li key={key} className="flex items-center cursor-pointer px-2 w-full h-9 rounded-md hover:bg-gray-alpha-300 active:bg-gray-alpha-300 font-sans text-sm text-gray-1000" onClick={() => onClick(value)}>
              {value.text}
            </li>
          )) : (
            <li className="flex items-center cursor-pointer px-2 w-full h-9 rounded-md hover:bg-gray-alpha-300 active:bg-gray-alpha-300 font-sans text-sm text-gray-1000">
              {inputValue}
            </li>
          )}
        </ul>
        {!compact && (
          <div className="p-4 pr-[30px]">
            <div className="font-sans text-gray-900 text-sm">Sugestões</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {typeRelativeTimes.map((value) => (
                <button key={value.text} className="font-mono text-[13px] text-gray-1000 px-1.5 h-5 inline-flex items-center bg-accents-2 border-none rounded cursor-pointer" onClick={() => onClick(value)}>
                  {value.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </Material>
    </div>
  );
};

export interface RangeValue { start: Date | null; end: Date | null; }

// --- CALENDAR EXPORT ---
interface CalendarProps {
  allowClear?: boolean; compact?: boolean; isDocsPage?: boolean; stacked?: boolean; horizontalLayout?: boolean;
  showTimeInput?: boolean; popoverAlignment?: "start" | "center" | "end";
  value: RangeValue | null; onChange: (date: RangeValue | null) => void;
  presets?: { [key: string]: { text: string; start: Date; end: Date } };
  presetIndex?: number; minValue?: Date; maxValue?: Date;
}

export const Calendar = ({
  allowClear = false, compact = false, isDocsPage = false, stacked = false, horizontalLayout = false,
  showTimeInput = false, popoverAlignment = "start", value, onChange, presets, presetIndex, minValue, maxValue
}: CalendarProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  
  // Use Browser Timezone
  const timezones = useMemo(() => ([{ value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: `Local` }]), []);
  const [selectedTimezone, setSelectedTimezone] = useState(timezones[0].value);

  // States for inputs (Start/End)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  const calendarRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(calendarRef, () => setIsOpen(false));

  useEffect(() => {
    // Format input display strings
    setStartDate(value?.start ? formatInTimeZone(value.start, selectedTimezone, "dd/MM/yyyy", { locale: ptBR }) : "");
    setEndDate(value?.end ? formatInTimeZone(value.end, selectedTimezone, "dd/MM/yyyy", { locale: ptBR }) : "");
  }, [isOpen, value, selectedTimezone]);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const daysArray = [];
  let day = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }); // Monday start
  while (day <= endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })) {
    daysArray.push(day);
    day = addDays(day, 1);
  }

  const handleDateClick = (day: Date) => {
    if (!value?.start || (value.start && value.end)) {
      onChange({ start: startOfDay(day), end: null });
      setHoverDate(day);
      setIsSelecting(true);
    } else if (isSelecting) {
      if (day > value.start) onChange({ ...value, end: endOfDay(day) });
      else onChange({ start: startOfDay(day), end: endOfDay(value.start) });
      setIsSelecting(false);
      setHoverDate(null);
      setIsOpen(false);
    }
  };

  const handleMouseEnter = (day: Date) => { if (value?.start && !value.end) setHoverDate(day); };

  return (
    <div className="relative font-sans">
      <div className={clsx(presets && "flex", presets && stacked && "flex-col", compact && "w-[220px]")}>
        <div className="flex justify-between items-center">
          <div className="relative">
            <Button
              className={clsx("!justify-start focus:!border-transparent focus:!shadow-focus-input", compact ? "w-[180px] gap-1.5" : "w-[250px]")}
              prefix={<CalendarIcon />}
              type="secondary"
              onClick={() => setIsOpen((p) => !p)}
            >
              <div className="truncate pr-4 capitalize">
                {value?.start && value?.end ? formatDateRange(value.start, value.end, selectedTimezone) : "Selecionar Data"}
              </div>
            </Button>
            {value?.start && value?.end && allowClear && (
              <Button svgOnly variant="unstyled" className="absolute right-0 top-1/2 -translate-y-1/2 fill-gray-700 hover:fill-gray-1000" onClick={() => onChange(null)}>
                <ClearIcon />
              </Button>
            )}
          </div>
        </div>
      </div>
      {isOpen && (
        <Material 
          ref={calendarRef} 
          type="menu" 
          className={twMerge(clsx(
            "p-3 font-sans absolute top-12 z-50 bg-white border border-slate-200 shadow-xl rounded-xl",
            horizontalLayout ? "w-[462px]" : "w-[300px]",
            popoverAlignment === "start" && "left-0",
            popoverAlignment === "center" && "left-1/2 -translate-x-1/2",
            popoverAlignment === "end" && "right-0 left-auto"
          ))}
        >
          <div className={clsx(horizontalLayout && "flex gap-5")}>
            <div className="w-full">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm text-gray-1000 font-medium capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <div className="flex gap-0.5">
                  <Button variant="unstyled" onClick={prevMonth}><ArrowLeftIcon /></Button>
                  <Button variant="unstyled" onClick={nextMonth}><ArrowRightIcon /></Button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-500 uppercase mb-2 font-medium">
                <div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div><div>D</div>
              </div>
              <div className="grid grid-cols-7 items-center gap-y-1">
                {daysArray.map((day) => {
                  const isStart = value?.start && isSameDay(day, value.start);
                  const isEnd = value?.end && isSameDay(day, value.end);
                  const isInRange = value?.start && ((value.end && isWithinInterval(day, { start: value.start, end: value.end })) || (hoverDate && isWithinInterval(day, { start: value.start, end: hoverDate })));
                  return (
                    <div key={day.toString()} className={clsx("flex items-center justify-center text-sm rounded transition h-8 w-8 cursor-pointer", isSameMonth(day, currentDate) ? "text-gray-900" : "text-gray-300", isInRange && !isStart && !isEnd && "bg-blue-50 text-blue-900 rounded-none", (isStart || isEnd) && "bg-gray-900 text-white rounded-md shadow-sm")} onMouseEnter={() => handleMouseEnter(day)} onClick={() => handleDateClick(day)}>
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Material>
      )}
    </div>
  );
};
