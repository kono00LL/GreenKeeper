import { CameraPreviewScreen } from '@/components/camera/camera-preview-screen';
import { CameraAccess } from '@/components/camera/camera-access';

export default function CameraPreviewPage() {
  return <CameraAccess><CameraPreviewScreen /></CameraAccess>;
}
