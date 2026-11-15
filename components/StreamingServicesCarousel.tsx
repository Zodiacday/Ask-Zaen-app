import React, { useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import { CalmColors } from '@/constants/Colors';
import { triggerHaptic } from '@/constants/haptics';
import { useSubscriptions } from '@/constants/SubscriptionsContext';

export type StreamingServiceId =
  | 'all'
  | 'youtube'
  | 'disney'
  | 'netflix'
  | 'prime'
  | 'pbs'
  | 'apple'
  | 'paramount'
  | 'bbc';

export interface StreamingServiceSpec {
  id: StreamingServiceId;
  name: string;
}

export const STREAMING_SERVICES: StreamingServiceSpec[] = [
  {
    id: 'all',
    name: 'All Platforms',
  },
  {
    id: 'youtube',
    name: 'YouTube',
  },
  {
    id: 'disney',
    name: 'Disney+',
  },
  {
    id: 'netflix',
    name: 'Netflix',
  },
  {
    id: 'prime',
    name: 'Prime Video',
  },
  {
    id: 'pbs',
    name: 'PBS KIDS',
  },
  {
    id: 'apple',
    name: 'Apple TV+',
  },
  {
    id: 'paramount',
    name: 'Paramount+',
  },
  {
    id: 'bbc',
    name: 'CBeebies',
  },
];

interface StreamingServicesCarouselProps {
  activeService: StreamingServiceId;
  onSelectService: (serviceId: StreamingServiceId) => void;
}

const STREAMING_LOGOS: Record<string, any> = {
  youtube: require('@/assets/images/streaming/youtube.png'),
  disney: require('@/assets/images/streaming/disney.png'),
  netflix: require('@/assets/images/streaming/netflix.png'),
  prime: require('@/assets/images/streaming/prime.png'),
  pbs: require('@/assets/images/streaming/pbs.png'),
  apple: require('@/assets/images/streaming/apple.png'),
  paramount: require('@/assets/images/streaming/paramount.png'),
  bbc: require('@/assets/images/streaming/cbeebies.png'),
};

export const StreamingServicesCarousel: React.FC<StreamingServicesCarouselProps> = ({
  activeService,
  onSelectService,
}) => {
  const { subscriptions } = useSubscriptions();

  // Only display platforms the family has active (plus 'All Platforms')
  const visibleServices = useMemo(() => {
    return STREAMING_SERVICES.filter((service) => {
      if (service.id === 'all') return true;
      if (subscriptions.includes(service.id)) return true;
      if (service.id === 'bbc' && subscriptions.includes('cbeebies')) return true;
      return false;
    });
  }, [subscriptions]);

  // If the active service was turned off in Settings, gracefully reset to 'all'
  useEffect(() => {
    if (activeService !== 'all' && !visibleServices.some((s) => s.id === activeService)) {
      onSelectService('all');
    }
  }, [visibleServices, activeService, onSelectService]);
  // Render official floating vector logo for each service
  const renderBrandLogo = (id: StreamingServiceId, isActive: boolean) => {
    switch (id) {
      case 'all':
        return (
          <View
            style={[
              styles.allChip,
              isActive ? styles.allChipActive : styles.allChipInactive,
            ]}
          >
            <Ionicons
              name="apps"
              size={13}
              color={isActive ? '#FFFFFF' : CalmColors.textMuted}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.allBrandText,
                isActive ? styles.allBrandTextActive : styles.allBrandTextInactive,
              ]}
            >
              ALL
            </Text>
          </View>
        );

      case 'youtube':
        return (
          <Image
            source={STREAMING_LOGOS.youtube}
            style={styles.svgLogoWide}
            resizeMode="contain"
          />
        );

      case 'disney':
        return (
          <Image
            source={STREAMING_LOGOS.disney}
            style={styles.svgLogoDisney}
            resizeMode="contain"
          />
        );

      case 'netflix':
        return (
          <Image
            source={STREAMING_LOGOS.netflix}
            style={styles.svgLogoNetflix}
            resizeMode="contain"
          />
        );

      case 'prime':
        return (
          <Image
            source={STREAMING_LOGOS.prime}
            style={styles.svgLogoPrime}
            resizeMode="contain"
          />
        );

      case 'pbs':
        return (
          <Image
            source={STREAMING_LOGOS.pbs}
            style={styles.svgLogoPbs}
            resizeMode="contain"
          />
        );

      case 'apple':
        return (
          <Image
            source={STREAMING_LOGOS.apple}
            style={styles.svgLogoApple}
            resizeMode="contain"
          />
        );

      case 'paramount':
        return (
          <Image
            source={STREAMING_LOGOS.paramount}
            style={styles.svgLogoParamount}
            resizeMode="contain"
          />
        );

      case 'bbc':
        return (
          <Image
            source={STREAMING_LOGOS.bbc}
            style={styles.svgLogoCbeebies}
            resizeMode="contain"
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating Logo Carousel (No Box/Block Backgrounds) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleServices.map((service) => {
          const isFiltered = activeService !== 'all';
          const isActive = activeService === service.id;

          const itemOpacity = isFiltered
            ? (isActive ? 1.0 : 0.38)
            : (service.id === 'all' ? 1.0 : 0.85);

          const itemScale = isFiltered
            ? (isActive ? 1.08 : 0.95)
            : 1.0;

          return (
            <PressableScale
              key={service.id}
              style={[
                styles.floatingItem,
                {
                  opacity: itemOpacity,
                  transform: [{ scale: itemScale }],
                },
                isActive && isFiltered && styles.floatingItemActiveElevated,
              ]}
              scaleTo={0.96}
              onPress={() => {
                triggerHaptic('selection');
                if (isActive && service.id !== 'all') {
                  onSelectService('all');
                } else {
                  onSelectService(service.id);
                }
              }}
            >
              {/* Pure Floating Brand Logo Slot */}
              <View style={styles.logoSlot}>
                {renderBrandLogo(service.id, isActive)}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 3,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 15,
  },

  /* Floating Logo Item Container */
  floatingItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  floatingItemActiveElevated: {
    shadowColor: 'rgba(74, 63, 56, 0.22)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  logoSlot: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* "ALL" Chip */
  allChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.3,
  },
  allChipActive: {
    backgroundColor: CalmColors.sage,
    borderColor: CalmColors.sage,
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  allChipInactive: {
    backgroundColor: 'rgba(74, 63, 56, 0.05)',
    borderColor: 'rgba(74, 63, 56, 0.12)',
  },
  allBrandText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  allBrandTextActive: {
    color: '#FFFFFF',
  },
  allBrandTextInactive: {
    color: CalmColors.textPrimary,
  },

  /* Official Vector Floating Logo Styles - Tuned to 80% (20% Smaller) */
  svgLogoWide: {
    width: 74,
    height: 21,
  },
  svgLogoDisney: {
    width: 70,
    height: 27,
  },
  svgLogoNetflix: {
    width: 70,
    height: 19,
  },
  svgLogoPrime: {
    width: 72,
    height: 22,
  },
  svgLogoPbs: {
    width: 44,
    height: 44,
  },
  svgLogoApple: {
    width: 48,
    height: 18,
  },
  svgLogoParamount: {
    width: 75,
    height: 19,
  },
  svgLogoCbeebies: {
    width: 70,
    height: 24,
  },
});
