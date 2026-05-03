import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KioskScreen from './src/screens/KioskScreen';

// The URL where your PHP server will listen for the handshake
const PROVISIONING_URL = 'https://subsidize.nexorha.com/api/provision.php';

const App = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupPin, setSetupPin] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@nexorha_agent_setup').then((value) => {
      if (value === 'FINISHED') {
        setSetupComplete(true);
      }
      setLoading(false);
    });
  }, []);

  // Generates a permanent unique ID for this specific phone
  const getOrCreateDeviceId = async () => {
    let deviceId = await AsyncStorage.getItem('@nexorha_device_id');
    if (!deviceId) {
      deviceId = 'NEX-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      await AsyncStorage.setItem('@nexorha_device_id', deviceId);
    }
    return deviceId;
  };

  const handleFinishSetup = async () => {
    if (setupPin.trim().length < 5) {
      Alert.alert('Error', 'Please enter a valid Nexorha Setup PIN from the dashboard.');
      return;
    }

    setIsProvisioning(true);
    
    try {
      const deviceId = await getOrCreateDeviceId();

      // 1. SILENT HANDSHAKE WITH YOUR PHP SERVER
      const response = await fetch(PROVISIONING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: setupPin,
          device_id: deviceId
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // 2. LOCK THE DEVICE PERMANENTLY
        await AsyncStorage.setItem('@nexorha_agent_setup', 'FINISHED');
        setSetupComplete(true);
      } else {
        Alert.alert('Provisioning Failed', data.message || 'Invalid PIN.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Ensure the phone has internet access to verify the PIN.');
    } finally {
      setIsProvisioning(false);
    }
  };

  if (loading) return null;
  if (setupComplete) return <KioskScreen />;

  return (
    <ScrollView contentContainerStyle={styles.wizardContainer}>
      <Text style={styles.title}>Nexorha Field Setup</Text>
      
      <View style={styles.stepBox}>
        <Text style={styles.stepHeader}>STEP 1: ADB Command</Text>
        <Text style={styles.stepText}>Run Bugjaeger command: dpm set-device-owner com.freekiosk/.DeviceAdminReceiver</Text>
      </View>

      <View style={styles.stepBox}>
        <Text style={styles.stepHeader}>STEP 2: Provisioning PIN</Text>
        <Text style={styles.stepText}>Enter the customer's unique setup PIN from your Nexorha Agent Dashboard:</Text>
        <TextInput 
          style={styles.input}
          placeholder="e.g. 849201"
          keyboardType="number-pad"
          value={setupPin}
          onChangeText={setSetupPin}
          editable={!isProvisioning}
        />
      </View>

      <TouchableOpacity 
        style={[styles.finishButton, isProvisioning && styles.disabledButton]} 
        onPress={handleFinishSetup}
        disabled={isProvisioning}
      >
        <Text style={styles.finishButtonText}>
          {isProvisioning ? "VERIFYING..." : "LINK DEVICE & ACTIVATE"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wizardContainer: { flexGrow: 1, backgroundColor: '#f4f4f4', padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 30 },
  stepBox: { backgroundColor: '#fff', padding: 20, borderRadius: 10, marginBottom: 20, borderLeftWidth: 5, borderLeftColor: '#2196F3', elevation: 2 },
  stepHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  stepText: { fontSize: 16, color: '#555', lineHeight: 24 },
  input: { backgroundColor: '#eee', padding: 15, borderRadius: 5, marginTop: 15, fontSize: 18, letterSpacing: 2, textAlign: 'center', fontWeight: 'bold' },
  finishButton: { backgroundColor: '#4CAF50', padding: 20, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9E9E9E' },
  finishButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default App;