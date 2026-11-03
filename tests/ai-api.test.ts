import { apiClient } from '@/services/http';
import { askPlantAdvice } from '@/services/ai-api';

jest.mock('@/services/http', () => ({ apiClient: { post: jest.fn() } }));

const originalDevDescriptor = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');

function setDevMode(value: boolean) {
  Object.defineProperty(globalThis, '__DEV__', { configurable: true, value });
}

function restoreDevMode() {
  if (originalDevDescriptor) Object.defineProperty(globalThis, '__DEV__', originalDevDescriptor);
  else Reflect.deleteProperty(globalThis, '__DEV__');
}

beforeEach(() => {
  jest.clearAllMocks();
  setDevMode(true);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  restoreDevMode();
});

test('logs only AI HTTP status and error code in development', async () => {
  const error = Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    config: { headers: { Authorization: 'Bearer private-token-marker' } },
    response: { status: 503, data: { error: { code: 'AI_NOT_CONFIGURED' } } },
  });
  (apiClient.post as jest.Mock).mockRejectedValue(error);

  await expect(askPlantAdvice('private-plant-marker', 'private question marker')).rejects.toBe(error);

  expect(console.error).toHaveBeenCalledWith('[ai-api] POST /ai/plant-advice failed', {
    status: 503,
    code: 'AI_NOT_CONFIGURED',
  });
  const logged = JSON.stringify(jest.mocked(console.error).mock.calls);
  expect(logged).not.toContain('private-token-marker');
  expect(logged).not.toContain('private-plant-marker');
  expect(logged).not.toContain('private question marker');
});

test('logs a missing HTTP response as a network diagnostic in development', async () => {
  const error = Object.assign(new Error('Network Error'), { isAxiosError: true });
  (apiClient.post as jest.Mock).mockRejectedValue(error);

  await expect(askPlantAdvice('plant-id', '问题')).rejects.toBe(error);

  expect(console.error).toHaveBeenCalledWith('[ai-api] POST /ai/plant-advice failed', {
    status: null,
    code: null,
  });
});

test('does not emit AI request diagnostics in production', async () => {
  setDevMode(false);
  (apiClient.post as jest.Mock).mockRejectedValue(Object.assign(new Error('Request failed'), { isAxiosError: true }));

  await expect(askPlantAdvice('plant-id', '问题')).rejects.toThrow('Request failed');

  expect(console.error).not.toHaveBeenCalled();
});
