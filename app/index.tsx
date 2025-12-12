import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isTfReady, setIsTfReady] = useState(false);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [prediction, setPrediction] = useState<string>('');
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
        setIsTfReady(true);
      } catch (err) {
        console.error("Failed to load model", err);
      }
    };
    loadModel();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const detectObject = async () => {
    if (cameraRef.current && model && isTfReady) {
      setDetecting(true);
      setPrediction("Analyzing...");
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (!photo) return;

        // Resize image to 224x224 as required by MobileNet
        const manipResult = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 224, height: 224 } }],
          { format: ImageManipulator.SaveFormat.JPEG }
        );

        // Read image data
        const imgB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
          encoding: 'base64',
        });
        const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
        const raw = new Uint8Array(imgBuffer);
        const imageTensor = decodeJpeg(raw);

        // Classify the image
        const predictions = await model.classify(imageTensor);
        
        if (predictions && predictions.length > 0) {
          setPrediction(
            `${predictions[0].className} (${(predictions[0].probability * 100).toFixed(1)}%)`
          );
        } else {
          setPrediction("Not sure what that is.");
        }
        
        // Clean up tensor
        imageTensor.dispose();

      } catch (error) {
        console.error(error);
        setPrediction("Error detecting object");
      } finally {
        setDetecting(false);
      }
    }
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
            {!isTfReady && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>Loading AI Model...</Text>
                </View>
            )}
            {prediction !== '' && (
                <View style={styles.predictionContainer}>
                    <Text style={styles.predictionText}>{prediction}</Text>
                </View>
            )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.detectButton, (!isTfReady || detecting) && styles.disabledButton]} 
            onPress={detectObject} 
            disabled={!isTfReady || detecting}
          >
            <Text style={styles.detectText}>{detecting ? "..." : "Detect"}</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  predictionContainer: {
    position: 'absolute',
    top: 50,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
  },
  predictionText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  button: {
    alignItems: 'center',
    padding: 10,
  },
  detectButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 30,
    minWidth: 100,
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  detectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
});
