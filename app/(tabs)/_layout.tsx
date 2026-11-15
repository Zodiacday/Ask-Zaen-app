import React from 'react';
import { Tabs } from 'expo-router';
import { Leaf, Binoculars, Globe, User } from 'phosphor-react-native';
import { CalmColors } from '@/constants/Colors';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useSaved } from '@/constants/SavedContext';
import { triggerHaptic } from '@/constants/haptics';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function ModernForestTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { savedMovies } = useSaved();

  // Filter out internal/hidden routes like 'saved'
  const publicRoutes = state.routes.filter((route) => route.name !== 'saved');

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      <View style={styles.dockContainer}>
        {publicRoutes.map((route) => {
          const isFocused = state.routes[state.index]?.name === route.name;
          const { options } = descriptors[route.key] || {};
          const label = options.title !== undefined ? options.title : route.name;

          const onPress = () => {
            triggerHaptic('selection');
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const isProfile = route.name === 'profile';

          return (
            <PressableScale
              key={route.key}
              style={[styles.tabChip, isFocused && styles.tabChipActive]}
              scaleTo={0.93}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <View style={styles.iconContainer}>
                {route.name === 'index' && (
                  <Leaf
                    size={19}
                    color={isFocused ? '#FFFFFF' : '#79866D'}
                    weight={isFocused ? 'fill' : 'bold'}
                  />
                )}
                {route.name === 'search' && (
                  <Binoculars
                    size={19}
                    color={isFocused ? '#FFFFFF' : '#79866D'}
                    weight={isFocused ? 'fill' : 'bold'}
                  />
                )}
                {route.name === 'languages' && (
                  <Globe
                    size={19}
                    color={isFocused ? '#FFFFFF' : '#79866D'}
                    weight={isFocused ? 'fill' : 'bold'}
                  />
                )}
                {route.name === 'profile' && (
                  <User
                    size={19}
                    color={isFocused ? '#FFFFFF' : '#79866D'}
                    weight={isFocused ? 'fill' : 'bold'}
                  />
                )}

                {isProfile && savedMovies.length > 0 && (
                  <View style={[styles.badge, isFocused && styles.badgeOnDark]}>
                    <Text style={styles.badgeCount}>
                      {savedMovies.length > 99 ? '99+' : savedMovies.length}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ModernForestTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Discover' }} />
      <Tabs.Screen name="languages" options={{ title: 'Languages' }} />
      <Tabs.Screen
        name="saved"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : (Platform.OS === 'web' ? 16 : 12),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(92, 107, 72, 0.18)',
    height: 62,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#1A2410',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  tabChip: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginHorizontal: 3,
    backgroundColor: 'transparent',
    gap: 2,
  },
  tabChipActive: {
    backgroundColor: '#1B2610',
    shadowColor: 'rgba(27, 38, 16, 0.28)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  iconContainer: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#79866D',
    letterSpacing: 0,
    lineHeight: 12,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: CalmColors.terracotta,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeOnDark: {
    borderColor: '#1B2610',
  },
  badgeCount: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
  },
});
