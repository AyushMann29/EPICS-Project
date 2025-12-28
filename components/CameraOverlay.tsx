import React from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { Detection } from '../hooks/useObjectDetection';

interface CameraOverlayProps {
    isTfReady: boolean;
    predictions: Detection[];
}

export function CameraOverlay({ isTfReady, predictions }: CameraOverlayProps) {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    const renderBoundingBoxes = () => {
        return predictions.map((p, index) => {
            const scaleX = screenWidth / 640;
            const scaleY = screenHeight / 640;

            const x = p.bbox[0] * scaleX;
            const y = p.bbox[1] * scaleY;
            const w = p.bbox[2] * scaleX;
            const h = p.bbox[3] * scaleY;

            return (
                <View key={index} style={[styles.bbox, { left: x, top: y, width: w, height: h }]}>
                    <Text style={styles.bboxText}>{p.class} {Math.round(p.score * 100)}%</Text>
                </View>
            );
        });
    };

    return (
        <View style={styles.overlay}>
            {!isTfReady && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>Loading YOLOv5...</Text>
                </View>
            )}
            {renderBoundingBoxes()}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bbox: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#00FF00',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    bboxText: {
        backgroundColor: '#00FF00',
        color: 'black',
        fontSize: 12,
        padding: 2,
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
});
