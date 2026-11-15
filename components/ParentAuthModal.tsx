import type { AuthFlowMode } from '@/constants/AuthContext';

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
  void visible;
  void signedIn;
  void mode;
  void onClose;
  return null;
}

