import { logDiagnostic } from '@/services/diagnostics';

test('redacts absolute Android paths from native error messages and stacks', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  logDiagnostic('image', new Error('FileNotFoundException(/data/user/0/host.exp.exponent/cache/ImagePicker/photo.jpg)'));

  const loggedDetails = errorSpy.mock.calls[0][1] as { message: string; stack: string };
  expect(loggedDetails.message).toContain('[local-path]');
  expect(loggedDetails.message).not.toContain('/data/user/0/host.exp.exponent');
  expect(loggedDetails.stack).not.toContain('/data/user/0/host.exp.exponent');
  errorSpy.mockRestore();
});
