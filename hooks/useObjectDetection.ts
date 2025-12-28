import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { CameraView } from 'expo-camera';

const YOLO_MODEL_URL = 'https://raw.githubusercontent.com/SkalskiP/yolov5js-zoo/master/models/coco/yolov5n/model.json';
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

export interface Detection {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

export function useObjectDetection() {
    const [isTfReady, setIsTfReady] = useState(false);
    const [model, setModel] = useState<tf.GraphModel | null>(null);
    const [predictions, setPredictions] = useState<Detection[]>([]);
    const [detecting, setDetecting] = useState(false);

    useEffect(() => {
        const loadModel = async () => {
            try {
                await tf.ready();
                const loadedModel = await tf.loadGraphModel(YOLO_MODEL_URL);
                setModel(loadedModel);
                setIsTfReady(true);
                console.log("YOLOv5n model loaded successfully");
            } catch (err) {
                console.error("Failed to load model", err);
            }
        };
        loadModel();
    }, []);

    const getDistanceLabel = (boxWidth: number, imageWidth: number) => {
        const ratio = boxWidth / imageWidth;
        if (ratio > 0.6) return "Very Close";
        if (ratio > 0.3) return "Close";
        return "Far";
    };

    const detectObject = async (cameraRef: React.RefObject<CameraView>) => {
        if (cameraRef.current && model && isTfReady) {
            setDetecting(true);
            try {
                const photo = await cameraRef.current.takePictureAsync();
                if (!photo) return;
                console.log("Photo taken:", photo.uri);

                // YOLOv5 expects 640x640
                const inputSize = 640;

                const manipResult = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: inputSize, height: inputSize } }],
                    { format: ImageManipulator.SaveFormat.JPEG }
                );

                const imgB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
                    encoding: 'base64',
                });
                const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
                const raw = new Uint8Array(imgBuffer);

                // Process tensor
                const imageTensor = decodeJpeg(raw);
                const inputTensor = imageTensor.resizeNearestNeighbor([inputSize, inputSize]).toFloat().div(255.0).expandDims(0);

                const imgMin = await inputTensor.min().data();
                const imgMax = await inputTensor.max().data();
                console.log(`Input Tensor Range: ${imgMin[0]} - ${imgMax[0]}`);

                // Run Inference
                console.log("Running inference...");
                const res = await model.executeAsync(inputTensor);
                console.log("Inference finished.");

                let boxesTensor: tf.Tensor | undefined;
                let scoresTensor: tf.Tensor | undefined;
                let classesTensor: tf.Tensor | undefined;

                if (Array.isArray(res)) {
                    console.log("Model returned array of " + res.length + " tensors");
                    res.forEach((t, i) => console.log(`Tensor ${i}: shape ${t.shape}`));

                    // Try to find based on shapes
                    // Boxes: [1, N, 4]
                    boxesTensor = res.find(t => t.shape.length === 3 && t.shape[2] === 4);

                    if (boxesTensor) {
                        const numDetections = boxesTensor.shape[1];
                        
                        // Find the two [1, N] tensors that are candidates for scores and classes
                        const candidates = res.filter(t => t.shape.length === 2 && t.shape[1] === numDetections && t !== boxesTensor);
                        
                        if (candidates.length >= 2) {
                            const data1 = await candidates[0].data();
                            const data2 = await candidates[1].data();
                            
                            // Heuristic: Classes are likely integers (potentially > 1). Scores are floats 0-1.
                            const max1 = Math.max(...data1);
                            const max2 = Math.max(...data2);
                            
                            // Check if values are integers
                            const is1Int = Array.from(data1.slice(0, 20)).every(n => Math.floor(n) === n);
                            const is2Int = Array.from(data2.slice(0, 20)).every(n => Math.floor(n) === n);

                            console.log(`Candidate 1: max=${max1}, isInt=${is1Int}`);
                            console.log(`Candidate 2: max=${max2}, isInt=${is2Int}`);

                            if (max1 > 1.0 || (is1Int && !is2Int)) {
                                classesTensor = candidates[0];
                                scoresTensor = candidates[1];
                                console.log("Inferred: Candidate 1 is Classes, Candidate 2 is Scores");
                            } else if (max2 > 1.0 || (!is1Int && is2Int)) {
                                classesTensor = candidates[1];
                                scoresTensor = candidates[0];
                                console.log("Inferred: Candidate 2 is Classes, Candidate 1 is Scores");
                            } else {
                                // Default fallback
                                scoresTensor = candidates[0];
                                classesTensor = candidates[1];
                                console.log("Ambiguous. Defaulting: Candidate 1 is Scores, Candidate 2 is Classes");
                            }
                        } else {
                             // Fallback if we can't find 2 candidates
                             scoresTensor = res.find(t => t.shape.length === 2 && t.shape[1] === numDetections);
                             classesTensor = res.find(t => t.shape.length === 2 && t.shape[1] === numDetections && t !== scoresTensor);
                        }
                    } else {
                        // Fallback to indices if shapes don't match expected
                        console.log("Could not find boxes by shape [1, N, 4]. Using indices 0,1,2.");
                        boxesTensor = res[0];
                        scoresTensor = res[1];
                        classesTensor = res[2];
                    }
                } else if (res instanceof tf.Tensor) {
                    console.log("Model returned single tensor:", res.shape);
                    // If it's [1, 25200, 85], we need to parse it differently (raw YOLO)
                    // For now, let's just log it.
                } else {
                    console.log("Model returned map:", Object.keys(res));
                    // Try to find by name if possible, or just values
                    const values = Object.values(res);
                    boxesTensor = values[0] as tf.Tensor; // Assumption
                    scoresTensor = values[1] as tf.Tensor | undefined;
                    classesTensor = values[2] as tf.Tensor | undefined;
                }

                if (boxesTensor && scoresTensor && classesTensor) {
                    const boxes = await boxesTensor.data(); // Float32Array
                    const scores = await scoresTensor.data(); // Float32Array
                    const classes = await classesTensor.data(); // Float32Array

                    const validDetections: Detection[] = [];

                    // Iterate through the detections
                    const numDetections = boxesTensor.shape[1];
                    let maxScore = 0;
                    for (let i = 0; i < numDetections; i++) {
                        const score = scores[i];
                        if (score > maxScore) maxScore = score;
                        if (score > 0.2) { // Threshold
                            const boxIdx = i * 4;
                            const classId = classes[i];

                            // YOLOv5 TFJS usually outputs [y1, x1, y2, x2] normalized 0-1
                            // But let's check if they are pixels ( > 1 )
                            let y1 = boxes[boxIdx];
                            let x1 = boxes[boxIdx+1];
                            let y2 = boxes[boxIdx+2];
                            let x2 = boxes[boxIdx+3];

                            // If values are small (< 2), they are likely normalized 0-1. Scale them.
                            if (x1 < 2 && y1 < 2 && x2 < 2 && y2 < 2) {
                                x1 *= inputSize;
                                y1 *= inputSize;
                                x2 *= inputSize;
                                y2 *= inputSize;
                            }

                            const w = x2 - x1;
                            const h = y2 - y1;

                            validDetections.push({
                                bbox: [x1, y1, w, h],
                                class: COCO_CLASSES[Math.round(classId)] || 'unknown',
                                score: score
                            });
                        }
                    }

                    console.log("Max score detected:", maxScore);
                    console.log("Parsed Detections:", validDetections);
                    setPredictions(validDetections);

                    if (validDetections.length > 0) {
                        const mainObject = validDetections[0];
                        const distance = getDistanceLabel(mainObject.bbox[2], inputSize);
                        const text = `I see a ${mainObject.class}, which is ${distance}`;
                        Speech.speak(text);
                    } else {
                        Speech.speak("I don't see anything.");
                    }
                } else {
                    console.log("Could not identify output tensors.");
                    Speech.speak("Error: Model output format unknown.");
                }

                // Cleanup
                tf.dispose([imageTensor, inputTensor]);
                if (Array.isArray(res)) {
                    res.forEach(t => t.dispose());
                } else if (res instanceof tf.Tensor) {
                    res.dispose();
                } else {
                    Object.values(res).forEach(t => (t as tf.Tensor).dispose());
                }

            } catch (error) {
                console.error(error);
                Speech.speak("Error detecting object");
            } finally {
                setDetecting(false);
            }
        }
    };

    return {
        isTfReady,
        detecting,
        predictions,
        detectObject
    };
}
