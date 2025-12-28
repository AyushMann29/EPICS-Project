import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ControlPanelProps {
    onFlip: () => void;
    onDetect: () => void;
    detecting: boolean;
    isTfReady: boolean;
}

export function ControlPanel({ onFlip, onDetect, detecting, isTfReady }: ControlPanelProps) {
    return (
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onFlip}>
                <Text style={styles.text}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.detectButton, (!isTfReady || detecting) && styles.disabledButton]}
                onPress={onDetect}
                disabled={!isTfReady || detecting}
            >
                <Text style={styles.detectText}>{detecting ? "..." : "Detect"}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
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
