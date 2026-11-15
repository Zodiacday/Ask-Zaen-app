import React from 'react';
import { Stack } from 'expo-router';
import { CalmColors } from '@/constants/Colors';

export default function LanguagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: CalmColors.canvasPrimary },
      }}
    />
  );
}
