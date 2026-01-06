import { requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import { ViewProps } from 'react-native';

export type Detection = {
  categories: {
    score: number;
    categoryName: string;
  }[];
  boundingBox: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
};

export type ObjectDetectorViewProps = {
  modelAssetPath: string;
  onDetectionResult?: (event: { nativeEvent: { detections: Detection[] } }) => void;
} & ViewProps;

const NativeView: React.ComponentType<ObjectDetectorViewProps> =
  requireNativeViewManager('ObjectDetectorModule');

export default function ObjectDetectorView(props: ObjectDetectorViewProps) {
  return <NativeView {...props} />;
}
