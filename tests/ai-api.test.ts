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

test('preserves the API error for the shared HTTP diagnostics interceptor', async () => {
  const error = Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    config: { headers: { Authorization: 'Bearer private-token-marker' } },
    response: { status: 503, data: { error: { code: 'AI_NOT_CONFIGURED' } } },
  });
  (apiClient.post as jest.Mock).mockRejectedValue(error);

  await expect(askPlantAdvice('private-plant-marker', 'private question marker')).rejects.toBe(error);
  expect(console.error).not.toHaveBeenCalled();
});

test('does not log at the service layer', async () => {
  setDevMode(false);
  (apiClient.post as jest.Mock).mockRejectedValue(Object.assign(new Error('Request failed'), { isAxiosError: true }));

  await expect(askPlantAdvice('plant-id', '问题')).rejects.toThrow('Request failed');

  expect(console.error).not.toHaveBeenCalled();
});
