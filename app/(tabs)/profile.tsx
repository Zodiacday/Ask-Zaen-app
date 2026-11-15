import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { ParentGateModal } from '@/components/ParentGateModal';
import { SettingsModal } from '@/components/SettingsModal';
import { useSubscriptions } from '@/constants/SubscriptionsContext';
import { useSaved } from '@/constants/SavedContext';
import { getProfileAgeInfo } from '@/constants/ageTiers';
import { ResilientPoster } from '@/components/ResilientPoster';
import { useOnboarding } from '@/constants/OnboardingContext';
import { triggerHaptic } from '@/constants/haptics';
import { useZaenAuth } from '@/constants/AuthContext';
import {
  GearSix,
  PaperPlaneTilt,
  ArrowCounterClockwise,
  CaretRight,
  ShieldCheck,
  BookmarkSimple,
} from 'phosphor-react-native';

const ZAEN_AVATAR = require('@/assets/images/logo.png');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { childAge, subscriptions } = useSubscriptions();
  const { resetOnboarding } = useOnboarding();
  const { savedMovies } = useSaved();
  const { authConfigured, isLoaded: authLoaded, isSignedIn, displayName, email, openAuth, signOut } = useZaenAuth();

  const [parentGateVisible, setParentGateVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'settings' | 'tell_zaen'>('settings');

  const topOffset = insets.top > 0 ? insets.top + 16 : 24;

  const currentAgeInfo = getProfileAgeInfo(childAge);

  const handleOpenSettings = () => {
    triggerHaptic('light');
    setSettingsInitialView('settings');
    setParentGateVisible(true);
  };

  const handleOpenTellZaen = () => {
    triggerHaptic('light');
    setSettingsInitialView('tell_zaen');
    setParentGateVisible(true);
  };

  const handleResetTourPrompt = () => {
    triggerHaptic('medium');
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Restart the welcome tour?');
      if (confirmed) {
        resetOnboarding();
      }
    } else {
      Alert.alert(
        'Restart Welcome Tour',
        'Would you like to restart the introductory tour?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restart',
            style: 'default',
            onPress: () => resetOnboarding(),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topOffset, paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentColumn}>
          {/* Clean Header: Zero Subtitle Fatigue */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Profile</Text>
          </View>

          {/* Parent Hub */}
          <View style={styles.parentHubCard}>
            <View style={styles.setupRow}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={ZAEN_AVATAR}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>Your Zaen setup</Text>
                <View style={styles.activePillRow}>
                  <View style={styles.agePill}>
                    <Image source={currentAgeInfo.icon} style={styles.agePillIcon} />
                    <Text style={styles.agePillText}>{currentAgeInfo.label}</Text>
                  </View>
                  <View style={styles.subsPill}>
                    <Text style={styles.subsPillText}>
                      {subscriptions.length} {subscriptions.length === 1 ? 'channel' : 'channels'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {authConfigured && authLoaded && (
              <>
                <View style={styles.hubDivider} />
                <View style={styles.accountRow}>
                  <PressableScale
                    style={styles.accountCardBody}
                    scaleTo={0.98}
                    accessibilityRole="button"
                    accessibilityLabel={isSignedIn ? 'Manage parent account' : 'Sign in or create a parent account'}
                    onPress={() => {
                      triggerHaptic('light');
                      openAuth();
                    }}
                  >
                    <View style={styles.accountIcon}>
                      <ShieldCheck size={22} color="#2D3B18" weight="bold" />
                    </View>
                    <View style={styles.accountCopy}>
                      <Text style={styles.accountTitle} numberOfLines={1}>
                        {isSignedIn ? (displayName || 'Parent account') : 'Sync your calm library'}
                      </Text>
                      {isSignedIn ? (
                        <>
                          <Text style={styles.accountSubtitle} numberOfLines={1}>
                            {email || 'Parent account'}
                          </Text>
                          <Text style={styles.accountSyncStatus} numberOfLines={1}>Synced across devices</Text>
                        </>
                      ) : (
                        <Text style={styles.accountSubtitle} numberOfLines={2}>
                          Sign in to sync saved titles and playlists
                        </Text>
                      )}
                    </View>
                  </PressableScale>

                  {isSignedIn ? (
                    <PressableScale
                      style={styles.signOutButton}
                      scaleTo={0.96}
                      accessibilityRole="button"
                      accessibilityLabel="Sign out"
                      onPress={() => { void signOut(); }}
                    >
                      <Text style={styles.signOutText}>Sign out</Text>
                    </PressableScale>
                  ) : (
                    <CaretRight size={19} color="#9BA788" weight="bold" />
                  )}
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionLabel}>YOUR LIBRARY</Text>

          {/* My List & Playlists */}
          <PressableScale
            style={styles.myListFeatureCard}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Open My List and Playlists"
            onPress={() => {
              triggerHaptic('light');
              router.push('/saved');
            }}
          >
            <View style={styles.myListCardLeft}>
              <View style={styles.myListIconBox}>
                <BookmarkSimple size={22} color="#2D3B18" weight="fill" />
              </View>
              <View style={styles.myListTextGroup}>
                <View style={styles.myListTitleRow}>
                  <Text style={styles.myListTitle} numberOfLines={1}>My List & Playlists</Text>
                  {savedMovies.length > 0 && (
                    <View style={styles.myListCountBadge}>
                      <Text style={styles.myListCountBadgeText}>
                        {savedMovies.length}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.myListSubtitle} numberOfLines={2}>
                  {savedMovies.length === 0
                    ? 'Save calming shows & create playlists'
                    : `${savedMovies.length} ${savedMovies.length === 1 ? 'title' : 'titles'} saved across playlists`}
                </Text>
              </View>
            </View>

            <View style={styles.myListCardRight}>
              {savedMovies.length > 0 ? (
                <View style={styles.posterStack}>
                  {savedMovies.slice(0, 3).map((item, idx) => (
                    <ResilientPoster
                      key={item.id}
                      item={item}
                      compact
                      style={[
                        styles.posterStackItem,
                        {
                          zIndex: 3 - idx,
                          marginLeft: idx > 0 ? -12 : 0,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.enterCircle}>
                <CaretRight size={17} color="#5C6B48" weight="bold" />
              </View>
            </View>
          </PressableScale>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>PARENT TOOLS</Text>

          {/* Parent Tools */}
          <View style={styles.parentToolsList}>
            <PressableScale
              style={styles.parentToolRow}
              scaleTo={0.99}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
              onPress={handleOpenSettings}
            >
              <View style={styles.toolIconCircle}>
                <GearSix size={20} color="#2D3B18" weight="bold" />
              </View>

              <Text style={styles.actionTitle}>Settings</Text>

              <View style={styles.lockBadge}>
                <ShieldCheck size={11} color="#5C6B48" weight="bold" />
                <Text style={styles.lockText}>Grown-Ups</Text>
              </View>

              <CaretRight size={17} color="#9BA788" weight="bold" />
            </PressableScale>

            <PressableScale
              style={[styles.parentToolRow, styles.parentToolRowBorder]}
              scaleTo={0.99}
              accessibilityRole="button"
              accessibilityLabel="Suggest a Show"
              onPress={handleOpenTellZaen}
            >
              <View style={styles.toolIconCircle}>
                <PaperPlaneTilt size={19} color="#2D3B18" weight="bold" />
              </View>

              <Text style={styles.actionTitle}>Suggest a Show</Text>

              <CaretRight size={17} color="#9BA788" weight="bold" />
            </PressableScale>

            <PressableScale
              style={[styles.parentToolRow, styles.parentToolRowBorder]}
              scaleTo={0.99}
              accessibilityRole="button"
              accessibilityLabel="Restart Welcome Tour"
              onPress={handleResetTourPrompt}
            >
              <View style={styles.toolIconCircle}>
                <ArrowCounterClockwise size={18} color="#2D3B18" weight="bold" />
              </View>

              <Text style={styles.actionTitle}>Welcome Tour</Text>

              <CaretRight size={17} color="#9BA788" weight="bold" />
            </PressableScale>
          </View>
        </View>
      </ScrollView>

      {/* Parent Gate Math Challenge */}
      <ParentGateModal
        visible={parentGateVisible}
        onSuccess={() => {
          setParentGateVisible(false);
          setSettingsVisible(true);
        }}
        onClose={() => setParentGateVisible(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        key={settingsInitialView}
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onResetTour={resetOnboarding}
        initialViewMode={settingsInitialView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  contentColumn: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    letterSpacing: -0.6,
  },
  parentHubCard: {
    backgroundColor: '#F1F4EA',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E7D6',
    shadowColor: '#2E3A1E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  setupRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3EBDD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E6D9C5',
    marginRight: 12,
  },
  avatarImage: {
    width: 45,
    height: 45,
  },
  profileInfo: {
    flex: 1,
  },
  hubDivider: {
    height: 1,
    backgroundColor: CalmColors.dividerSubtle,
    marginTop: 12,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountCardBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCE7C8',
  },
  accountCopy: { flex: 1, minWidth: 0 },
  accountTitle: { color: '#2D3B18', fontFamily: 'Quicksand_700Bold', fontSize: 16 },
  accountSubtitle: { color: '#6D7A5A', fontFamily: 'Quicksand_600SemiBold', fontSize: 11.5, marginTop: 2 },
  accountSyncStatus: { color: '#82936B', fontFamily: 'Quicksand_700Bold', fontSize: 10.5, marginTop: 3 },
  signOutButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#E6EBDD',
  },
  signOutText: { color: '#5C6B48', fontFamily: 'Quicksand_700Bold', fontSize: 11 },
  sectionLabel: {
    color: '#71815B',
    fontFamily: 'Quicksand_700Bold',
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionLabelSpaced: {
    marginTop: 24,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    marginBottom: 6,
  },
  activePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  agePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3E6',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E2C2',
  },
  agePillIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
    borderRadius: 7,
  },
  agePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34471F',
  },
  subsPill: {
    backgroundColor: '#F7EFE2',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7D9C3',
  },
  subsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E5132',
  },
  myListFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    minHeight: 76,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  myListCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 10,
  },
  myListIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E7EFE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myListTextGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  myListTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2311',
    letterSpacing: -0.2,
  },
  myListCountBadge: {
    backgroundColor: '#DDE8D2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(92, 107, 72, 0.20)',
  },
  myListCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2B3B18',
  },
  myListSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#657252',
    marginTop: 2,
  },
  myListCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  posterStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterStackItem: {
    width: 32,
    height: 44,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E7EFE0',
  },
  enterCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(92, 107, 72, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentToolsList: {
    backgroundColor: CalmColors.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    overflow: 'hidden',
  },
  parentToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  parentToolRowBorder: {
    borderTopWidth: 1,
    borderTopColor: CalmColors.dividerSubtle,
  },
  toolIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E7EFE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF3E3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
    gap: 3.5,
  },
  lockText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4B5E33',
  },
});
