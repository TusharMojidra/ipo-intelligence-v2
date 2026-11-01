import React, { useState, useEffect, useRef } from 'react';

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (val: number) => void;
  allowDecimals?: boolean;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  id?: string;
}

function sanitizeNumericString(
  raw: string,
  allowDecimals: boolean,
  allowNegative: boolean
): string {
  if (raw === '.') return '0.';
  if (raw === '-.' && allowNegative) return '-0.';

  let clean = '';
  let hasDecimal = false;
  let hasMinus = false;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c >= '0' && c <= '9') {
      clean += c;
    } else if (c === '.' && allowDecimals && !hasDecimal) {
      clean += '.';
      hasDecimal = true;
    } else if (c === '-' && allowNegative && clean.length === 0 && !hasMinus) {
      clean += '-';
      hasMinus = true;
    }
  }

  if (clean.startsWith('.')) {
    clean = '0' + clean;
  } else if (clean.startsWith('-.')) {
    clean = '-0.' + clean.slice(2);
  }

  // Strip leading zeroes if followed by a digit: e.g. "05" -> "5", "-05" -> "-5"
  // Intentionally leaves "0", "0.", "-0", "-0." untouched
  if (/^0[0-9]/.test(clean)) {
    clean = clean.replace(/^0+/, '');
    if (clean === '') clean = '0';
  } else if (/^-0[0-9]/.test(clean)) {
    clean = '-' + clean.slice(1).replace(/^0+/, '');
    if (clean === '-') clean = '-0';
  }

  return clean;
}

/**
 * Mobile- and desktop-friendly NumericInput component.
 * 
 * Solves:
 * 1. Stuck leading 0: Automatically strips leading zero when new digits are typed ("05" -> "5").
 * 2. Backspace freeze: Allows clearing the field to empty without instantly restoring "0".
 * 3. Decimal preservation: Preserves "2." and "183.0" while actively typing without cursor reset.
 * 4. Tap-to-replace: Auto-selects text on focus so typing immediately replaces prior value.
 * 5. Touch keyboards: Uses inputMode="decimal" for native numeric keypads on iOS & Android.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  allowDecimals = true,
  allowNegative = false,
  min,
  max,
  placeholder,
  className = '',
  id,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [localVal, setLocalVal] = useState<string>(() =>
    value === 0 ? '' : String(value)
  );
  const isFocusedRef = useRef(false);

  // Sync external changes (presets, real IPO selection, resets)
  useEffect(() => {
    const currentNum = localVal === '' ? 0 : Number(localVal);
    if (!isFocusedRef.current || currentNum !== value) {
      setLocalVal(value === 0 ? '' : String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = sanitizeNumericString(raw, allowDecimals, allowNegative);

    setLocalVal(clean);

    if (clean === '' || clean === '-' || clean === '-0') {
      onChange(0);
      return;
    }

    if (clean.endsWith('.')) {
      const numBeforeDot = Number(clean.slice(0, -1));
      if (!isNaN(numBeforeDot)) {
        onChange(numBeforeDot);
      }
      return;
    }

    const parsed = Number(clean);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    e.target.select();
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    if (localVal === '' || localVal === '-' || isNaN(Number(localVal))) {
      const fallback = min !== undefined && min > 0 ? min : 0;
      setLocalVal(fallback === 0 ? '' : String(fallback));
      onChange(fallback);
    } else {
      let num = Number(localVal);
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      setLocalVal(num === 0 ? '' : String(num));
      onChange(num);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <input
      {...rest}
      id={id}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      spellCheck={false}
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
};
