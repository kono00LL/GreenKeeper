jest.mock('expo-file-system', () => {
  const state = {
    files: new Map<string, { exists: boolean; size: number }>(),
    copiedFiles: [] as Array<{ source: string; destination: string }>,
    deletedFiles: [] as string[],
    deletedDirectories: [] as string[],
    createdDirectories: [] as string[],
    directoryExists: false,
    copyError: null as Error | null,
    leavePartialFile: false,
    reset() {
      this.files.clear();
      this.copiedFiles = [];
      this.deletedFiles = [];
      this.deletedDirectories = [];
      this.createdDirectories = [];
      this.directoryExists = false;
      this.copyError = null;
      this.leavePartialFile = false;
    },
  };
  const document = { uri: 'file:///app/document' };
  const join = (parts: string[]) => {
    if (parts.length === 1) return parts[0];
    return parts.slice(1).reduce((path, part) => `${path.replace(/\/+$/, '')}/${part.replace(/^\/+/, '')}`, parts[0]);
  };

  class MockFile {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = join(parts.map((part) => typeof part === 'string' ? part : part.uri));
    }

    get extension() {
      const name = this.uri.split('/').pop() ?? '';
      const dot = name.lastIndexOf('.');
      return dot < 0 ? '' : name.slice(dot);
    }

    info() {
      return state.files.get(this.uri) ?? { exists: false, size: 0 };
    }

    async copy(destination: MockFile) {
      state.copiedFiles.push({ source: this.uri, destination: destination.uri });
      if (state.copyError) {
        if (state.leavePartialFile) state.files.set(destination.uri, { exists: true, size: 3 });
        throw state.copyError;
      }
      const source = state.files.get(this.uri);
      if (!source?.exists) throw new Error('FileNotFoundException');
      state.files.set(destination.uri, { exists: true, size: source.size });
    }

    delete() {
      state.deletedFiles.push(this.uri);
      state.files.delete(this.uri);
    }
  }

  class MockDirectory {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = join(parts.map((part) => typeof part === 'string' ? part : part.uri));
    }

    info() {
      return { exists: state.directoryExists };
    }

    create() {
      state.directoryExists = true;
      state.createdDirectories.push(this.uri);
    }

    list() {
      const prefix = `${this.uri}/`;
      return [...state.files.keys()]
        .filter((uri) => uri.startsWith(prefix) && !uri.slice(prefix.length).includes('/'))
        .map((uri) => new MockFile(uri));
    }

    delete() {
      state.deletedDirectories.push(this.uri);
      const prefix = `${this.uri}/`;
      for (const uri of state.files.keys()) {
        if (uri.startsWith(prefix)) state.files.delete(uri);
      }
      state.directoryExists = false;
    }
  }

  return { Directory: MockDirectory, File: MockFile, Paths: { document }, __state: state };
});

import {
  cleanupPreviewImages,
  deletePreviewImage,
  getPreviewImageDiagnostics,
  preparePreviewImage,
} from '@/services/preview-image';
import { Platform } from 'react-native';

const mockFileSystem = jest.requireMock('expo-file-system') as {
  __state: {
    files: Map<string, { exists: boolean; size: number }>;
    copiedFiles: Array<{ source: string; destination: string }>;
    deletedFiles: string[];
    deletedDirectories: string[];
    createdDirectories: string[];
    directoryExists: boolean;
    copyError: Error | null;
    leavePartialFile: boolean;
    reset: () => void;
  };
};

const state = mockFileSystem.__state;
const sourceUri = 'file:///cache/ImagePicker/selected.jpg';
const previewDirectoryUri = 'file:///app/document/camera-preview';

beforeEach(() => {
  state.reset();
  state.files.set(sourceUri, { exists: true, size: 1234 });
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('copies a readable source image into the app document directory', async () => {
  const uri = await preparePreviewImage(sourceUri);

  expect(uri).toMatch(/^file:\/\/\/app\/document\/camera-preview\/[\w-]+\.jpg$/);
  expect(state.createdDirectories).toEqual([previewDirectoryUri]);
  expect(state.copiedFiles).toEqual([{ source: sourceUri, destination: uri }]);
  expect(state.files.get(uri)).toEqual({ exists: true, size: 1234 });
});

test('logs safe metadata and rejects when the source file is missing', async () => {
  state.files.delete(sourceUri);
  const errorSpy = jest.mocked(console.error);

  await expect(preparePreviewImage(sourceUri)).rejects.toThrow('Unable to prepare selected image');

  expect(state.copiedFiles).toHaveLength(0);
  expect(errorSpy).toHaveBeenCalledWith('[image] preview preparation failed', expect.objectContaining({
    uriScheme: 'file',
    sourceLocation: 'cache',
    fileExists: false,
    fileSizeBytes: null,
  }));
  expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('/data/user/0/');
});

test('removes a partial copy and logs the copy failure without absolute paths', async () => {
  state.copyError = new Error('FileNotFoundException(/data/user/0/host.exp.exponent/cache/selected.jpg)');
  state.leavePartialFile = true;
  const errorSpy = jest.mocked(console.error);

  await expect(preparePreviewImage(sourceUri)).rejects.toThrow('Unable to prepare selected image');

  expect(state.deletedFiles).toHaveLength(1);
  expect(state.files.has(state.deletedFiles[0])).toBe(false);
  expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('/data/user/0/host.exp.exponent');
});

test('reports local file metadata without returning its absolute URI', () => {
  expect(getPreviewImageDiagnostics(sourceUri)).toEqual({
    uriScheme: 'file',
    sourceLocation: 'cache',
    fileExists: true,
    fileSizeBytes: 1234,
  });
});

test('keeps browser image URLs unchanged without using the unsupported file system', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  const uri = 'blob:https://greenkeeper.local/selected-image';

  try {
    expect(await preparePreviewImage(uri)).toBe(uri);
    expect(getPreviewImageDiagnostics(uri)).toEqual({
      uriScheme: 'blob',
      sourceLocation: 'other',
      fileExists: null,
      fileSizeBytes: null,
    });
    expect(state.copiedFiles).toHaveLength(0);
  } finally {
    platform.restore();
  }
});

test('deletes only preview files owned by the app preview directory', async () => {
  const ownedUri = `${previewDirectoryUri}/preview.jpg`;
  state.files.set(ownedUri, { exists: true, size: 100 });

  await deletePreviewImage(ownedUri);
  await deletePreviewImage('file:///app/document/other.jpg');

  expect(state.deletedFiles).toEqual([ownedUri]);
});

test('cleans preview files left behind after an interrupted app session', async () => {
  const staleUri = `${previewDirectoryUri}/stale.jpg`;
  state.directoryExists = true;
  state.files.set(staleUri, { exists: true, size: 100 });

  await cleanupPreviewImages();

  expect(state.deletedDirectories).toEqual([previewDirectoryUri]);
  expect(state.files.has(staleUri)).toBe(false);
  expect(state.directoryExists).toBe(false);
});
