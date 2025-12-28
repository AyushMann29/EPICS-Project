import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

interface PermissionScreenProps {
    onRequestPermission: () => void;
}

export function PermissionScreen({ onRequestPermission }: PermissionScreenProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.message}>We need your permission to show the camera</Text>
            <Button onPress={onRequestPermission} title="grant permission" />
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
});
