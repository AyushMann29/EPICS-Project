import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraOverlay } from '../components/CameraOverlay';
import { ControlPanel } from '../components/ControlPanel';
import { PermissionScreen } from '../components/PermissionScreen';
import { useObjectDetection } from '../hooks/useObjectDetection';



export default function Index() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const { isTfReady, detecting, predictions, detectObject } = useObjectDetection();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const handleDetect = () => {
      detectObject(cameraRef);
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <CameraOverlay isTfReady={isTfReady} predictions={predictions} />
        <ControlPanel 
            onFlip={toggleCameraFacing} 
            onDetect={handleDetect} 
            detecting={detecting} 
            isTfReady={isTfReady} 
        />
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
});
