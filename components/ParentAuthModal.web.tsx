import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '@clerk/expo/web';
import type { AuthFlowMode } from '@/constants/AuthContext';
import ZaenAuthScreen from '@/components/ZaenAuthScreen';

export default function ParentAuthModal({
  visible,
  signedIn,
  mode,
  onClose,
}: {
  visible: boolean;
  signedIn: boolean;
  mode: AuthFlowMode;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {signedIn ? (
          <>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close account dialog">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            <UserProfile routing="hash" />
            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </>
        ) : (
          <ZaenAuthScreen key={mode} initialMode={mode} onClose={onClose} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', alignItems: 'center', backgroundColor: '#FAF8F5' },
  closeButton: { position: 'absolute', top: 16, right: 20, zIndex: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E6EBDD' },
  closeText: { color: '#5C6B48', fontWeight: '700' },
  doneButton: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 18, backgroundColor: '#E6EBDD' },
  doneText: { color: '#5C6B48', fontWeight: '700' },
});

