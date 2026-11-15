import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { ParentGateModal } from '@/components/ParentGateModal';

export function useParentExternalLink() {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const openExternalLink = useCallback((url: string | null | undefined) => {
    const cleanUrl = url?.trim();
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) return;
    setPendingUrl(cleanUrl);
  }, []);
  const gate = (
    <ParentGateModal
      visible={pendingUrl !== null}
      onSuccess={() => {
        const url = pendingUrl;
        setPendingUrl(null);
        if (url) Linking.openURL(url).catch(() => {});
      }}
      onClose={() => setPendingUrl(null)}
    />
  );
  return { openExternalLink, parentLinkGate: gate };
}

