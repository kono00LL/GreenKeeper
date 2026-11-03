import { AxiosHeaders, isAxiosError } from 'axios';

declare const __DEV__: boolean;

export function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isDevelopment() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function diagnosticPath(value?: string) {
  if (!value) return null;
  try {
    return new URL(value, 'http://greenkeeper.local').pathname;
  } catch {
    return value.split('?')[0];
  }
}

function redact(value: string) {
  return value
    .replace(/https?:\/\/[^\s?]+\?[^\s)]+/gi, (url) => `${url.split('?')[0]}?[redacted]`)
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/((?:api[-_]?key|access[-_]?token|refresh[-_]?token|secret|signature|sign)\s*[:=]\s*)[^\s&,;]+/gi, '$1[redacted]')
    .replace(/file:\/\/[^\s)]+/gi, 'file://[redacted]');
}

export function logDiagnostic(label: string, error: unknown, context: Record<string, unknown> = {}) {
  if (!isDevelopment()) return;
  if (isAxiosError(error)) {
    const headers = AxiosHeaders.from(error.config?.headers);
    const responseHeaders = AxiosHeaders.from(error.response?.headers as unknown as AxiosHeaders | undefined);
    console.error(label, {
      ...context,
      method: error.config?.method?.toUpperCase() ?? null,
      path: diagnosticPath(error.config?.url),
      status: error.response?.status ?? null,
      code: (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code ?? error.code ?? null,
      requestId: responseHeaders.get('X-Request-ID') ?? headers.get('X-Request-ID') ?? null,
      name: error.name,
      message: redact(error.message),
    });
    return;
  }
  const value = error instanceof Error ? error : new Error(String(error));
  console.error(label, {
    ...context,
    name: value.name,
    message: redact(value.message),
    stack: value.stack ? redact(value.stack) : null,
  });
}

export function logNonHttpDiagnostic(label: string, error: unknown, context: Record<string, unknown> = {}) {
  if (isAxiosError(error)) return;
  if (error instanceof Error && ['Session changed', 'Upload canceled', 'Identification canceled'].includes(error.message)) return;
  logDiagnostic(label, error, context);
}
