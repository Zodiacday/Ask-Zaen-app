import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { UserProfileView } from '@clerk/expo/native-components';
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
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        {signedIn ? (
          <UserProfileView style={styles.profile} isDismissible onDismiss={onClose} />
        ) : (
          <ZaenAuthScreen key={mode} initialMode={mode} onClose={onClose} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  profile: { flex: 1 },
});

