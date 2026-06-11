export const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

export const sanitizeIntegerInput = (value?: string | null) => onlyDigits(value);

export const sanitizeDecimalInput = (value?: string | null) => {
  const input = String(value || '');
  let result = '';
  let separatorUsed = false;

  for (const char of input) {
    if (/\d/.test(char)) {
      result += char;
      continue;
    }

    if ((char === '.' || char === ',') && !separatorUsed) {
      result += char;
      separatorUsed = true;
    }
  }

  return result;
};

export const limitDigits = (value: string, maxLength: number) => onlyDigits(value).slice(0, maxLength);

export const hasExactLength = (value: string, expectedLength: number) =>
  onlyDigits(value).length === expectedLength;

export const hasLengthBetween = (value: string, minLength: number, maxLength: number) => {
  const length = onlyDigits(value).length;
  return length >= minLength && length <= maxLength;
};
