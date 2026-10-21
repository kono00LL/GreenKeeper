import { CameraCaptureScreen } from '@/components/camera/camera-capture-screen';
import { CameraAccess } from '@/components/camera/camera-access';

export default function CameraPage() {
  return <CameraAccess><CameraCaptureScreen /></CameraAccess>;
}
