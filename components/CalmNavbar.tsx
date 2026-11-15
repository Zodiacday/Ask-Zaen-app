import React from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import { CalmColors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/PressableScale';

const BRAND_MARK = require('@/assets/images/askzaen_wave_z_mark.png');

interface CalmNavbarProps {
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onCategorySelect?: (catId: string) => void;
  activeCategory?: string;
  categories?: { id: string; title: string; badge: string }[];
  selectedAgeTier?: any;
  onAgeTierSelect?: (tier: any) => void;
  onLogoLongPress?: () => void;
}

export const CalmNavbar: React.FC<CalmNavbarProps> = ({
  onLogoLongPress,
}) => {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top + 8 : 14;

  return (
    <View style={[styles.floatingWrapper, { top: topOffset }]}>
      {/* Liquid Glass Capsule Bar */}
      <View style={styles.capsuleBar}>
        {/* Brand */}
        <PressableScale
          style={styles.brandContainer}
          onLongPress={onLogoLongPress}
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel="Ask Zaen"
        >
          <Image
            source={BRAND_MARK}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandAsk}>Ask </Text>
          <Text style={styles.brandZaen}>Zaen</Text>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 90,
    alignItems: 'flex-start',
  },
  capsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CalmColors.surfaceGlass,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    shadowColor: 'rgba(74, 63, 56, 0.12)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 5,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 34,
    height: 34,
    marginRight: 6,
  },
  brandAsk: {
    fontFamily: 'DynaPuff_700Bold',
    color: CalmColors.textPrimary,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  brandZaen: {
    fontFamily: 'DynaPuff_700Bold',
    color: CalmColors.sage,
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
