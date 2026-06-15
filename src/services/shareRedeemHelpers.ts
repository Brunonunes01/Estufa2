export type RedeemRateState = {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
};

export const SHARE_CODE_MIN_LENGTH = 20;

export const normalizeShareCode = (code: string) => code.trim().toUpperCase();

export const validateNormalizedShareCode = (normalizedCode: string, minLength = SHARE_CODE_MIN_LENGTH) => {
  if (!normalizedCode) {
    throw new Error('Codigo invalido.');
  }
  if (normalizedCode.length < minLength) {
    throw new Error(`Codigo invalido. Use o codigo completo (${minLength}+ caracteres).`);
  }
};

export const getRedeemCooldownSeconds = (blockedUntil: number, now: number) =>
  Math.ceil((blockedUntil - now) / 1000);

export const shouldResetRedeemWindow = (state: RedeemRateState, now: number, windowMs: number) =>
  now - state.windowStartedAt > windowMs;

export const applyRedeemAttempt = (
  state: RedeemRateState,
  success: boolean,
  now: number,
  windowMs: number,
  maxAttempts: number,
  cooldownMs: number
): RedeemRateState => {
  const withinWindow = now - state.windowStartedAt <= windowMs;
  const attempts = success ? 0 : withinWindow ? state.attempts + 1 : 1;
  const blockedUntil = !success && attempts >= maxAttempts ? now + cooldownMs : 0;

  return {
    attempts,
    windowStartedAt: withinWindow ? state.windowStartedAt : now,
    blockedUntil,
  };
};
