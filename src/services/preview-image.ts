import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { logDiagnostic } from '@/services/diagnostics';

const previewDirectoryName = 'camera-preview';

type PreviewImageDiagnostics = {
  uriScheme: string | null;
  sourceLocation: 'cache' | 'application-document' | 'application-file' | 'content-provider' | 'other';
  fileExists: boolean | null;
  fileSizeBytes: number | null;
};

function getPreviewDirectory() {
  return new Directory(Paths.document, previewDirectoryName);
}

function getOwnedFileName(uri: string) {
  const prefix = `${getPreviewDirectory().uri.replace(/\/+$/, '')}/`;
  if (!uri.startsWith(prefix)) return null;
  const name = uri.slice(prefix.length);
  return /^[\w.-]+$/.test(name) && name !== '.' && name !== '..' ? name : null;
}

function safeFileInfo(uri: string) {
  try {
    return new File(uri).info();
  } catch {
    return null;
  }
}

export function getPreviewImageDiagnostics(uri: string): PreviewImageDiagnostics {
  const uriScheme = uri.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase() ?? null;
  const sourceLocation = Platform.OS === 'web'
    ? 'other'
    : uriScheme === 'content'
      ? 'content-provider'
      : uri.includes('/cache/')
        ? 'cache'
        : getOwnedFileName(uri)
          ? 'application-document'
          : uriScheme === 'file'
            ? 'application-file'
            : 'other';
  const info = Platform.OS === 'web' || uriScheme !== 'file' ? null : safeFileInfo(uri);

  return {
    uriScheme,
    sourceLocation,
    fileExists: info?.exists ?? null,
    fileSizeBytes: info?.exists ? info.size ?? null : null,
  };
}

export async function preparePreviewImage(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;

  let destination: File | null = null;
  try {
    const source = new File(uri);
    const sourceInfo = source.info();
    if (!sourceInfo.exists || sourceInfo.size === 0) {
      throw new Error('Selected image is missing or empty');
    }

    const directory = getPreviewDirectory();
    directory.create({ intermediates: true, idempotent: true });
    const extension = /^\.[a-z\d]{1,8}$/i.test(source.extension) ? source.extension.toLowerCase() : '.jpg';
    const fileName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${extension}`;
    destination = new File(directory, fileName);
    await source.copy(destination);

    const destinationInfo = destination.info();
    if (!destinationInfo.exists || destinationInfo.size === 0) {
      throw new Error('Preview image copy is missing or empty');
    }
    return destination.uri;
  } catch (error) {
    try {
      if (destination?.info().exists) destination.delete();
    } catch {
      // A failed copy should not hide its original diagnostic.
    }
    logDiagnostic('[image] preview preparation failed', error, getPreviewImageDiagnostics(uri));
    throw new Error('Unable to prepare selected image');
  }
}

export async function deletePreviewImage(uri: string): Promise<void> {
  if (Platform.OS === 'web' || !getOwnedFileName(uri)) return;
  try {
    const file = new File(uri);
    if (file.info().exists) file.delete();
  } catch (error) {
    logDiagnostic('[image] preview cleanup failed', error, {
      sourceLocation: 'application-document',
    });
  }
}

export async function cleanupPreviewImages(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const directory = getPreviewDirectory();
    if (directory.info().exists) directory.delete();
  } catch (error) {
    logDiagnostic('[image] stale preview cleanup failed', error, {
      sourceLocation: 'application-document',
    });
  }
}
