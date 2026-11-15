import React, { useRef, useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  Text,
  Image,
  useWindowDimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { AgeTier } from '@/constants/kidsDb';
import { triggerHaptic } from '@/constants/haptics';

// Brand & Visual Assets
const BRAND_MARK = require('@/assets/images/askzaen_wave_z_mark.png');
const ZAEN_WAVING_ICON = require('@/assets/icons/zaen_waving.png');
const POSTCARD_CLEAN_CARD = require('@/assets/images/postcard_clean_card.png');
const postcardAsset =
  typeof Image.resolveAssetSource === 'function'
    ? Image.resolveAssetSource(POSTCARD_CLEAN_CARD)
    : { width: 512, height: 698 };
const POSTCARD_ASPECT_RATIO =
  (postcardAsset?.height ?? 0) / (postcardAsset?.width ?? 1) || 1;

// Custom Filter Icons for Slide 1
const WHIRLWIND_ICON = require('@/assets/icons/whirlwind.png');
const SPROUT_ICON = require('@/assets/icons/sprout.png');

// Platform Logos for Slide 2
const YOUTUBE_LOGO = require('@/assets/images/streaming/youtube.png');
const DISNEY_LOGO = require('@/assets/images/streaming/disney.png');
const PBS_LOGO = require('@/assets/images/streaming/pbs.png');
const NETFLIX_LOGO = require('@/assets/images/streaming/netflix.png');
const APPLE_LOGO = require('@/assets/images/streaming/apple.png');
const PRIME_LOGO = require('@/assets/images/streaming/prime.png');
const CBEEBIES_LOGO = require('@/assets/images/streaming/cbeebies.png');

// Organic Meandering Footpath Curves connecting the Paw Trail
const TRAIL_PATHS = [
  'M 2 9 C 10 16, 22 2, 30 9',  // Segment 0: S-curve dipping down then up
  'M 2 9 C 10 2, 22 16, 30 9',  // Segment 1: Inverted crest curving up then down
  'M 2 9 C 11 15, 21 3, 30 9',  // Segment 2: Natural woodland swing
];
const TRAIL_DRAW_LENGTH = 40;
const TRAIL_DRAW_DURATION = 220;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

interface FloatingBadgeConfig {
  id: string;
  logo: any;
  width: number;
  height: number;
  rotate?: string;
  delay?: number;
  duration?: number;
}

const FLOATING_PLATFORMS: FloatingBadgeConfig[] = [
  { id: 'youtube', logo: YOUTUBE_LOGO, width: 96, height: 28, rotate: '-2deg', delay: 0, duration: 2800 },
  { id: 'disney', logo: DISNEY_LOGO, width: 90, height: 38, rotate: '2.5deg', delay: 400, duration: 3200 },
  { id: 'pbs', logo: PBS_LOGO, width: 48, height: 48, rotate: '-1.5deg', delay: 700, duration: 2600 },
  { id: 'netflix', logo: NETFLIX_LOGO, width: 90, height: 26, rotate: '1.5deg', delay: 200, duration: 3000 },
  { id: 'apple', logo: APPLE_LOGO, width: 84, height: 28, rotate: '-2.5deg', delay: 500, duration: 2900 },
  { id: 'prime', logo: PRIME_LOGO, width: 88, height: 28, rotate: '2deg', delay: 900, duration: 3100 },
  { id: 'cbeebies', logo: CBEEBIES_LOGO, width: 84, height: 32, rotate: '-2deg', delay: 350, duration: 2700 },
];

const FloatingBadge: React.FC<{ item: FloatingBadgeConfig }> = ({ item }) => {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (!isMounted) return;
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -5,
            duration: (item.duration || 2800) / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(anim, {
            toValue: 5,
            duration: item.duration || 2800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: (item.duration || 2800) / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    }, item.delay || 0);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [anim, item.delay, item.duration]);

  return (
    <Animated.View
      style={[
        styles.logoCapsule,
        {
          transform: [
            { translateY: anim },
            { rotate: item.rotate || '0deg' },
          ],
        },
      ]}
    >
      <Image
        source={item.logo}
        style={{ width: item.width, height: item.height }}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

// Handcrafted Clay Zaen Bear Mascot Evolution for Slide 3
const BEAR_BABY_ICON = require('@/assets/icons/bear_baby.png');
const BEAR_PRESCHOOL_ICON = require('@/assets/icons/bear_preschool.png');
const BEAR_EXPLORER_ICON = require('@/assets/icons/bear_explorer.png');

export const ONBOARDING_COMPLETED_KEY = '@ask_zaen_onboarding_completed_v1';
export const USER_PREFERRED_AGE_KEY = '@ask_zaen_preferred_age_tier';

interface SlideConfig {
  id: string;
  image: any;
}

const SLIDES: SlideConfig[] = [
  { id: 'slide_welcome', image: require('@/assets/images/onboarding_nature_welcome.jpg') },
  { id: 'slide_1', image: require('@/assets/images/onboarding_nature2.jpg') },
  { id: 'slide_2', image: require('@/assets/images/onboarding_nature1.jpg') },
  { id: 'slide_3', image: require('@/assets/images/onboarding_nature3.jpg') },
];

const AGE_TIERS: {
  id: AgeTier;
  title: string;
  icon: any;
  iconSize: number;
}[] = [
  {
    id: 'preschool',
    title: 'Ages 0 to 3',
    icon: BEAR_BABY_ICON,
    iconSize: 34,
  },
  {
    id: 'big_kids',
    title: 'Ages 4 to 6',
    icon: BEAR_PRESCHOOL_ICON,
    iconSize: 50,
  },
  {
    id: 'tweens',
    title: 'Ages 7+',
    icon: BEAR_EXPLORER_ICON,
    iconSize: 68,
  },
];

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (selectedTier?: AgeTier) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onComplete,
}) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList<unknown>>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [trailCompletion] = useState(() => new Animated.Value(0));
  const trailAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pendingIndexRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<AgeTier>('preschool');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Keep the composition responsive across phone, tablet, and web viewports.
  // The height-based cap prevents a wide browser from making the postcard
  // taller than the available scene while preserving the source artwork ratio.
  const contentWidth = Math.min(windowWidth * 0.9, windowHeight * 0.55);
  const layout = {
    contentWidth,
    postcardHeight: contentWidth * POSTCARD_ASPECT_RATIO,
    slideTopPadding: Math.max(windowHeight * 0.07, insets.top + windowHeight * 0.02),
    slideBottomPadding: insets.bottom + windowHeight * 0.16,
    controlsHorizontalPadding: windowWidth * 0.05,
    controlsBottomPadding: insets.bottom + windowHeight * 0.03,
    trailGap: windowHeight * 0.02,
    primaryButtonHeight: windowHeight * 0.075,
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const animateTrailCompletion = (targetIndex: number) => {
    if (targetIndex === currentIndex) {
      return;
    }

    trailAnimationRef.current?.stop();
    trailCompletion.setValue(currentIndex);

    const distance = Math.abs(targetIndex - currentIndex);
    const animation = Animated.timing(trailCompletion, {
      toValue: targetIndex,
      duration: reduceMotion ? 0 : TRAIL_DRAW_DURATION * distance,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    trailAnimationRef.current = animation;
    animation.start(() => {
      trailAnimationRef.current = null;
    });
  };

  const commitIndex = (index: number) => {
    setCurrentIndex(index);
    pendingIndexRef.current = null;
    programmaticScrollRef.current = false;
    setIsTransitioning(false);
  };

  const scrollToIndex = (index: number) => {
    if (
      index < 0 ||
      index >= SLIDES.length ||
      index === currentIndex ||
      programmaticScrollRef.current
    ) {
      return;
    }

    pendingIndexRef.current = index;
    programmaticScrollRef.current = true;
    setIsTransitioning(true);
    animateTrailCompletion(index);

    const list = flatListRef.current;
    if (!list) {
      commitIndex(index);
      return;
    }

    try {
      list.scrollToOffset({
        offset: index * windowWidth,
        animated: !reduceMotion,
      });
    } catch {
      try {
        list.scrollToIndex({
          index,
          animated: !reduceMotion,
        });
      } catch {
        commitIndex(index);
      }
    }

    if (reduceMotion) {
      commitIndex(index);
    }
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / windowWidth);
    if (index >= 0 && index < SLIDES.length) {
      if (pendingIndexRef.current !== index) {
        animateTrailCompletion(index);
      }
      commitIndex(index);
    }
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (isLastSlide) {
      handleFinish();
    } else {
      scrollToIndex(currentIndex + 1);
    }
  };

  const handleFinish = async () => {
    triggerHaptic('success');
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      await AsyncStorage.setItem(USER_PREFERRED_AGE_KEY, selectedTier);
    } catch {
      // ignore
    }
    onComplete(selectedTier);
  };

  // --- SLIDE 0: Welcome & Parent Appreciation (Tactile Deckle Postcard) ---
  const renderSlideWelcome = () => (
    <View style={[styles.cardWrapper, { width: layout.contentWidth }]}>
      <View
        style={[
          styles.postcardContainer,
          { width: layout.contentWidth, height: layout.postcardHeight },
        ]}
      >
        {/* Tactile Deckle Postcard with Wax Seal & Washi Ribbon */}
        <Image
          source={POSTCARD_CLEAN_CARD}
          style={styles.postcardImg}
          resizeMode="contain"
        />

        {/* Smaller Waving Zaen Bear standing next to his signature */}
        <Image
          source={ZAEN_WAVING_ICON}
          style={[
            styles.postcardSmallBear,
            { width: layout.contentWidth * 0.2, height: layout.contentWidth * 0.2 },
          ]}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  // --- SLIDE 1: Sensory Meltdown Filter Card ---
  const renderSlide1 = () => (
    <View style={[styles.cardWrapper, { width: layout.contentWidth }]}>
      <Text
        style={styles.titleText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        Shows that are gentle on growing minds.
      </Text>

      {/* 2 Separate Filter Cards matching Slide 2 style */}
      <View style={styles.filterCardsList}>
        {/* Card 1: Filtered Out */}
        <View style={styles.filterBox}>
          <View style={styles.filterIconSlot}>
            <Image
              source={WHIRLWIND_ICON}
              style={styles.filterIconBig}
              resizeMode="contain"
            />
          </View>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterLabelBlocked}>FILTERED OUT</Text>
            <Text style={styles.filterDescBlocked}>
              Flashing lights, loud shouting & crazy noise
            </Text>
          </View>
        </View>

        {/* Card 2: What Gets In */}
        <View style={styles.filterBox}>
          <View style={styles.filterIconSlot}>
            <Image
              source={SPROUT_ICON}
              style={styles.filterIconSprout}
              resizeMode="contain"
            />
          </View>
          <View style={styles.filterTextCol}>
            <Text style={styles.filterLabelCalm}>WHAT GETS IN</Text>
            <Text style={styles.filterDescCalm}>
              Gentle stories, soft voices & sweet learning
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // --- SLIDE 2: Floating Streaming Constellation ---
  const renderSlide2 = () => (
    <View style={[styles.cardWrapper, { width: layout.contentWidth }]}>
      <Text style={styles.titleText}>
        Tap any show and it plays right in your apps.
      </Text>

      {/* Floating Logo Constellation */}
      <View style={styles.constellationContainer}>
        {/* Row 1: YouTube & Disney+ */}
        <View style={styles.constellationRow}>
          <FloatingBadge item={FLOATING_PLATFORMS[0]} />
          <FloatingBadge item={FLOATING_PLATFORMS[1]} />
        </View>

        {/* Row 2: Netflix, PBS KIDS, Apple TV+ */}
        <View style={[styles.constellationRow, { gap: 10 }]}>
          <FloatingBadge item={FLOATING_PLATFORMS[3]} />
          <FloatingBadge item={FLOATING_PLATFORMS[2]} />
          <FloatingBadge item={FLOATING_PLATFORMS[4]} />
        </View>

        {/* Row 3: Prime Video & CBeebies */}
        <View style={styles.constellationRow}>
          <FloatingBadge item={FLOATING_PLATFORMS[5]} />
          <FloatingBadge item={FLOATING_PLATFORMS[6]} />
        </View>
      </View>
    </View>
  );

  // --- SLIDE 3: Interactive Age Selection ---
  const renderSlide3 = () => (
    <View style={[styles.cardWrapper, { width: layout.contentWidth }]}>
      <Text style={styles.titleText}>
        How old is your child?{'\n'}I’ll put the right shows at the top.
      </Text>

      {/* 3 Storybook Mascot Cards */}
      <View style={styles.ageCardsWrap}>
        {AGE_TIERS.map((tier) => {
          const isSelected = selectedTier === tier.id;
          return (
            <PressableScale
              key={tier.id}
              onPress={() => {
                triggerHaptic('selection');
                setSelectedTier(tier.id);
              }}
              scaleTo={0.98}
              style={[
                styles.ageCard,
                isSelected && styles.ageCardSelected,
              ]}
            >
              <View style={[styles.ageIconWrap, isSelected && styles.ageIconWrapSelected]}>
                <Image
                  source={tier.icon}
                  style={{ width: tier.iconSize, height: tier.iconSize }}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.ageTextWrap}>
                <Text style={[styles.ageTitle, isSelected && styles.ageTitleSelected]}>
                  {tier.title}
                </Text>
              </View>

              <View style={[styles.ageRadio, isSelected && styles.ageRadioSelected]}>
                {isSelected ? (
                  <Ionicons name="checkmark" size={14} color="#FAF8F5" />
                ) : (
                  <View style={styles.ageRadioUnchecked} />
                )}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );

  const renderSlideItem = ({ index }: { index: number }) => {
    return (
      <View
        style={[
          styles.slideContainer,
          {
            width: windowWidth,
            height: windowHeight,
            paddingTop: layout.slideTopPadding,
            paddingBottom: layout.slideBottomPadding,
          },
        ]}
      >
        {/* Content floats above the single root-level background layer. */}
        {index === 0 && renderSlideWelcome()}
        {index === 1 && renderSlide1()}
        {index === 2 && renderSlide2()}
        {index === 3 && renderSlide3()}
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.rootOverlay}>
      {SLIDES.map((slide, index) => {
        const opacity = scrollX.interpolate({
          inputRange: [
            (index - 1) * windowWidth,
            index * windowWidth,
            (index + 1) * windowWidth,
          ],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        const translateX = reduceMotion
          ? 0
          : scrollX.interpolate({
              inputRange: [
                (index - 1) * windowWidth,
                index * windowWidth,
                (index + 1) * windowWidth,
              ],
              outputRange: [windowWidth * 0.06, 0, -windowWidth * 0.06],
              extrapolate: 'clamp',
            });

        return (
          <Animated.Image
            key={slide.id}
            source={slide.image}
            style={[
              styles.fullBleedBackground,
              { opacity, transform: [{ translateX }] },
            ]}
            resizeMode="cover"
            pointerEvents="none"
            accessible={false}
          />
        );
      })}
      <View style={styles.container}>
        {/* Top Header: Brand Capsule */}
        <View style={[styles.headerBar, { top: insets.top > 0 ? insets.top + 8 : 14 }]}>
          <View style={styles.headerBrand}>
            <Image
              source={BRAND_MARK}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandAsk}>Ask </Text>
            <Text style={styles.brandZaen}>Zaen</Text>
          </View>
        </View>

        {/* Swipeable Carousel */}
        <AnimatedFlatList
          ref={flatListRef}
          style={styles.carousel}
          data={SLIDES}
          renderItem={renderSlideItem}
          keyExtractor={(_, index) => SLIDES[index].id}
          horizontal
          pagingEnabled
          snapToInterval={windowWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: Platform.OS !== 'web' },
          )}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          bounces={false}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
        />

        {/* Bottom Floating Navigation Bar */}
        <View
          style={[
            styles.bottomControls,
            {
              paddingHorizontal: layout.controlsHorizontalPadding,
              paddingBottom: layout.controlsBottomPadding,
            },
          ]}
        >
          {/* Zaen Bear Trail Progress Stepper */}
          <View style={[styles.trailPod, { marginBottom: layout.trailGap }]}> 
            {SLIDES.map((_, i) => {
              const isVisited = i < currentIndex;
              const isActive = currentIndex === i;
              const footAngle = i % 2 === 0 ? '-12deg' : '12deg';

              return (
                <React.Fragment key={i}>
                  {/* Connecting Meandering Footpath Curve */}
                  {i > 0 && (
                    <View style={styles.svgTrailWrapper}>
                      <Svg width={32} height={18} viewBox="0 0 32 18">
                        {/* Every connector stays visible as a quiet guide. */}
                        <Path
                          d={TRAIL_PATHS[(i - 1) % TRAIL_PATHS.length]}
                          fill="none"
                          stroke="rgba(44, 37, 35, 0.58)"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeDasharray="2, 6"
                        />

                        {/* The sage overlay stays filled after the segment is completed. */}
                        <AnimatedPath
                          d={TRAIL_PATHS[(i - 1) % TRAIL_PATHS.length]}
                          fill="none"
                          stroke={CalmColors.sageDark}
                          strokeWidth={3.5}
                          strokeLinecap="round"
                          strokeDasharray={TRAIL_DRAW_LENGTH}
                          strokeDashoffset={trailCompletion.interpolate({
                            inputRange: [i - 1, i],
                            outputRange: [TRAIL_DRAW_LENGTH, 0],
                            extrapolate: 'clamp',
                          })}
                          opacity={trailCompletion.interpolate({
                            inputRange: [i - 1, i],
                            outputRange: [0, 1],
                            extrapolate: 'clamp',
                          })}
                        />
                      </Svg>
                    </View>
                  )}

                  {/* Paw Step Node */}
                  <PressableScale
                    onPress={() => scrollToIndex(i)}
                    disabled={isTransitioning}
                    style={[
                      styles.pawNode,
                      isActive && styles.pawNodeActive,
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    haptic="selection"
                    accessibilityLabel={`Step ${i + 1} of ${SLIDES.length}`}
                  >
                    <Ionicons
                      name="paw"
                      size={isActive ? 29 : 19}
                      color={
                        isActive
                          ? '#E86A2B'
                          : isVisited
                          ? CalmColors.sageDark
                          : 'rgba(44, 37, 35, 0.88)'
                      }
                      style={{ transform: [{ rotate: footAngle }] }}
                    />
                  </PressableScale>
                </React.Fragment>
              );
            })}
          </View>

          {/* Primary Action Button */}
          <PressableScale
            onPress={handleNext}
            disabled={isTransitioning}
            style={[styles.primaryButton, { minHeight: layout.primaryButtonHeight, paddingVertical: 0 }]}
            haptic="medium"
          >
            <Text style={styles.primaryButtonText}>{isLastSlide ? 'Start exploring' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FAF8F5" style={{ marginLeft: 8 }} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10000,
    elevation: 1000,
    backgroundColor: CalmColors.canvasPrimary,
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  fullBleedBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  headerBar: {
    position: 'absolute',
    left: 34,
    right: 24,
    zIndex: 100,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 248, 245, 0.97)',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(112, 117, 82, 0.22)',
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
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(250, 248, 245, 0.90)',
    borderWidth: 1,
    borderColor: CalmColors.dividerSubtle,
  },
  skipButtonText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13.5,
    color: CalmColors.textMuted,
  },
  skipPlaceholder: {
    width: 44,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  // --- Slide 0: Tactile Deckle Postcard Styles ---
  postcardContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postcardImg: {
    width: '100%',
    height: '100%',
  },
  postcardSmallBear: {
    position: 'absolute',
    bottom: '7.5%',
    right: '11%',
    width: 78,
    height: 78,
  },
  badgePill: {
    backgroundColor: 'rgba(250, 248, 245, 0.92)',
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CalmColors.sageBorder,
    marginBottom: 10,
    shadowColor: '#2C2523',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CalmColors.sageDark,
    letterSpacing: 0.2,
  },
  titleText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 17,
    color: CalmColors.textPrimary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  subtitleText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: CalmColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 12,
  },

  // --- Slide 1: Filter Card Styles (Matching Slide 2 minimal boxes) ---
  filterCardsList: {
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  filterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#2C2523',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  filterIconSlot: {
    width: 74,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filterIconBig: {
    width: 62,
    height: 62,
  },
  filterIconSprout: {
    width: 76,
    height: 76,
  },
  filterTextCol: {
    flex: 1,
  },
  filterLabelBlocked: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14.5,
    textDecorationLine: 'underline',
    color: '#B84545',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  filterDescBlocked: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
    color: CalmColors.textMuted,
    lineHeight: 17,
  },
  filterLabelCalm: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14.5,
    textDecorationLine: 'underline',
    color: CalmColors.sageDark,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  filterDescCalm: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
    color: CalmColors.textPrimary,
    lineHeight: 17,
  },

  // --- Slide 2: Streaming Logo Constellation (Pure Free Floating) ---
  constellationContainer: {
    width: '100%',
    paddingVertical: 24,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constellationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  logoCapsule: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(250, 248, 245, 0.90)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CalmColors.dividerSubtle,
  },
  reassuranceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: CalmColors.textMuted,
  },

  // --- Slide 3: Age Selection Cards ---
  ageCardsWrap: {
    width: '100%',
    gap: 10,
  },
  ageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 63, 56, 0.08)',
    shadowColor: '#2C2523',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  ageCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: CalmColors.terracotta,
    shadowOpacity: 0.10,
    shadowRadius: 10,
  },
  ageIconWrap: {
    width: 60,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ageIconWrapSelected: {
    transform: [{ scale: 1.06 }],
  },
  ageIconImg: {
    width: 58,
    height: 58,
  },
  ageTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  ageTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16.5,
    color: CalmColors.textPrimary,
    letterSpacing: 0.1,
  },
  ageTitleSelected: {
    color: CalmColors.terracottaDark,
  },
  ageRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: CalmColors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  ageRadioSelected: {
    backgroundColor: CalmColors.terracotta,
    borderColor: CalmColors.terracotta,
  },
  ageRadioUnchecked: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },

  // --- Bottom Floating Controls ---
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
  },
  trailPod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  svgTrailWrapper: {
    width: 32,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  pawNode: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  pawNodeActive: {
    backgroundColor: 'rgba(232, 106, 43, 0.16)',
    transform: [{ scale: 1.15 }],
    shadowColor: '#E86A2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: CalmColors.textPrimary,
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: '#2C2523',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
    cursor: 'pointer',
  },
  primaryButtonFinish: {
    backgroundColor: CalmColors.terracottaDark,
  },
  primaryButtonText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16.5,
    color: '#FAF8F5',
    letterSpacing: 0.3,
  },
});
