import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LanguageBrowse } from '@/components/LanguageBrowse';

export default function LanguageHubScreen() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  return <LanguageBrowse initialCode={code} showBack />;
}
