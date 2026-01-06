import { useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { PermissionScreen } from '../components/PermissionScreen';
// @ts-ignore
import ObjectDetectorView, { Detection } from 'sticker-smash-object-detector';
import { useAssets } from 'expo-asset';

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  // TODO: Download the model file from https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite
  // and place it in assets/efficientdet_lite0.tflite
  // const [assets] = useAssets([require('../assets/efficientdet_lite0.tflite')]);
  
  // Mocking the asset loading for now to prevent crash if file missing
  const assets = [{ localUri: "" }]; 

  const [predictions, setPredictions] = useState<Detection[]>([]);

  if (!permission) return <View />;

  if (!permission.granted) {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  const handleDetectionResult = (event: { nativeEvent: { detections: Detection[] } }) => {
    setPredictions(event.nativeEvent.detections);
  };

  return (
    <View style={styles.container}>
      <ObjectDetectorView 
        style={styles.camera}
        // Pass the local URI of the model file
        modelAssetPath={assets && assets[0] ? assets[0].localUri : ""}
        onDetectionResult={handleDetectionResult}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {predictions.map((p, i) => {
                const box = p.boundingBox;
                const cat = p.categories[0];
                // Note: Coordinates are in image space. You may need to scale them 
                // based on the view dimensions vs image dimensions (usually 640x480 or 4:3 aspect ratio)
                return (
                    <View key={i} style={{
                        position: 'absolute',
                        left: box.originX,
                        top: box.originY,
                        width: box.width,
                        height: box.height,
                        borderWidth: 2,
                        borderColor: 'red',
                        zIndex: 100
                    }}>
                        <Text style={{color: 'red', backgroundColor: 'white', alignSelf: 'flex-start'}}>
                            {cat?.categoryName} {Math.round((cat?.score || 0) * 100)}%
                        </Text>
                    </View>
                )
            })}
        </View>
      </ObjectDetectorView>
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
