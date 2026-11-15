import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useSignIn, useSignUp } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import { Ionicons } from '@expo/vector-icons';
import type { SignInFirstFactor } from '@clerk/shared/types';
import type { AuthFlowMode } from '@/constants/AuthContext';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { triggerHaptic } from '@/constants/haptics';

const BOTANICAL_BACKGROUND = require('@/assets/images/auth_botanical_background_v2.jpg');
const BRAND_MARK = require('@/assets/images/askzaen_wave_z_mark.png');

type AuthMode = 'signIn' | 'signUp';
type AuthStep = 'entry' | 'emailEntry' | 'signUpPassword' | 'factor' | 'verifyCode' | 'emailLinkSent' | 'forgotPasswordCode' | 'resetPassword';
type SignInFactor = 'password' | 'emailCode' | 'emailLink';
type SignUpFactor = 'emailCode' | 'emailLink';

type ZaenAuthScreenProps = {
  initialMode: AuthFlowMode;
  onClose: () => void;
};

type ClerkErrorLike = {
  longMessage?: string;
  message?: string;
  code?: string;
};

const getClerkErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const clerkError = error as ClerkErrorLike;
  const message = clerkError.longMessage || clerkError.message;
  if (!message) return fallback;

  if (/network|offline|fetch|timeout/i.test(message)) {
    return 'We could not connect. Check your connection and try again.';
  }
  if (/invalid.*email|email.*invalid/i.test(message)) {
    return 'Enter a valid email address.';
  }
  if (/password/i.test(message) && /short|weak|required|invalid/i.test(message)) {
    return 'Choose a stronger password and try again.';
  }
  if (/code|verification/i.test(message) && /incorrect|invalid|expired/i.test(message)) {
    return 'That code is no longer valid. Check it or request a new one.';
  }
  return message;
};

const isCancelledSSO = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const clerkError = error as ClerkErrorLike;
  return /cancel|dismiss|closed|user.?abort/i.test(
    `${clerkError.code || ''} ${clerkError.message || ''} ${clerkError.longMessage || ''}`,
  );
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getFactorStrategies = (factors: SignInFirstFactor[] | null | undefined) =>
  (factors || []).map((factor) => factor.strategy as string);

export default function ZaenAuthScreen({ initialMode, onClose }: ZaenAuthScreenProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [mode, setMode] = useState<AuthMode>(initialMode === 'signUp' ? 'signUp' : 'signIn');
  const [step, setStep] = useState<AuthStep>('entry');
  const [signInFactor, setSignInFactor] = useState<SignInFactor>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const redirectUrl = useMemo(
    () => makeRedirectUri({ scheme: 'askzaen', path: 'auth' }),
    [],
  );

  const signInStrategies = getFactorStrategies(signIn.supportedFirstFactors);
  const signUpStrategies = signUp.verifications.emailAddress.supportedStrategies || [];
  const canUseSignInCode = signInStrategies.includes('email_code');
  const canUseSignInLink = signInStrategies.includes('email_link');
  const canUseSignUpCode = signUpStrategies.includes('email_code');
  const canUseSignUpLink = signUpStrategies.includes('email_link');
  const isWide = width >= 700;

  const resetFlow = (nextMode: AuthMode = mode) => {
    setMode(nextMode);
    setStep('entry');
    setSignInFactor('password');
    setPassword('');
    setCode('');
    setShowPassword(false);
    setBusy(false);
    setError(null);
    setNotice(null);
  };

  const handleModeChange = (nextMode: AuthMode) => {
    if (busy) return;
    resetFlow(nextMode);
  };

  const handleOpenEmailEntry = () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    setStep('emailEntry');
  };

  const openLegal = (path: '/legal/terms' | '/legal/privacy') => {
    onClose();
    setTimeout(() => router.push(path), 180);
  };

  const handleSSO = async (provider: 'Apple' | 'Google') => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startSSOFlow({
        strategy: provider === 'Apple' ? 'oauth_apple' : 'oauth_google',
        redirectUrl,
      });

      if (result.createdSessionId) {
        triggerHaptic('success');
        onClose();
        return;
      }

      setError('The account could not be completed. Please try again.');
    } catch (caughtError) {
      if (!isCancelledSSO(caughtError)) {
        setError(`Could not connect to ${provider}. Please try again.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const finalizeSignIn = async () => {
    const result = await signIn.finalize();
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not finish signing you in. Please try again.'));
      return false;
    }
    triggerHaptic('success');
    onClose();
    return true;
  };

  const finalizeSignUp = async () => {
    const result = await signUp.finalize();
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not finish creating your account. Please try again.'));
      return false;
    }
    triggerHaptic('success');
    onClose();
    return true;
  };

  const sendSignInCode = async () => {
    const result = await signIn.emailCode.sendCode();
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not send a verification code. Please try again.'));
      return false;
    }
    setSignInFactor('emailCode');
    setStep('verifyCode');
    setNotice(`We sent a verification code to ${email}.`);
    return true;
  };

  const sendSignInLink = async () => {
    const result = await signIn.emailLink.sendLink({ verificationUrl: redirectUrl });
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not send the sign-in link. Please try again.'));
      return false;
    }
    setSignInFactor('emailLink');
    setStep('emailLinkSent');
    setNotice(`Check ${email} for your secure sign-in link.`);
    void signIn.emailLink.waitForVerification().then(async (verificationResult) => {
      if (verificationResult.error) {
        setError(getClerkErrorMessage(verificationResult.error, 'The sign-in link expired. Please request a new one.'));
        return;
      }
      setBusy(true);
      await finalizeSignIn();
      setBusy(false);
    });
    return true;
  };

  const sendSignUpCode = async () => {
    const result = await signUp.verifications.sendEmailCode();
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not send a verification code. Please try again.'));
      return false;
    }
    setStep('verifyCode');
    setNotice(`We sent a verification code to ${email}.`);
    return true;
  };

  const sendSignUpLink = async () => {
    const result = await signUp.verifications.sendEmailLink({ verificationUrl: redirectUrl });
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not send the sign-up link. Please try again.'));
      return false;
    }
    setStep('emailLinkSent');
    setNotice(`Check ${email} to verify your parent account.`);
    void signUp.verifications.waitForEmailLinkVerification().then(async (verificationResult) => {
      if (verificationResult.error) {
        setError(getClerkErrorMessage(verificationResult.error, 'The verification link expired. Please request a new one.'));
        return;
      }
      setBusy(true);
      await finalizeSignUp();
      setBusy(false);
    });
    return true;
  };

  const sendResetPasswordCode = async () => {
    const result = await signIn.resetPasswordEmailCode.sendCode();
    if (result.error) {
      setError(getClerkErrorMessage(result.error, 'We could not send a reset code. Please try again.'));
      return false;
    }
    setStep('forgotPasswordCode');
    setCode('');
    setNotice(`We sent a password reset code to ${email}.`);
    return true;
  };

  const handleForgotPassword = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendResetPasswordCode();
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not start password recovery. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResetCodeSubmit = async () => {
    if (busy || code.trim().length < 4) {
      if (code.trim().length < 4) setError('Enter the password reset code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (result.error) {
        setError(getClerkErrorMessage(result.error, 'That reset code did not work. Check it and try again.'));
        return;
      }
      setPassword('');
      setShowPassword(false);
      setStep('resetPassword');
      setNotice('Choose a new password for your parent account.');
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not verify that reset code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleNewPasswordSubmit = async () => {
    if (busy || password.length < 8) {
      if (password.length < 8) setError('Choose a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (result.error) {
        setError(getClerkErrorMessage(result.error, 'We could not update your password. Please try again.'));
        return;
      }
      await finalizeSignIn();
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not update your password. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailContinue = async () => {
    if (busy) return;
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signIn') {
        const result = await signIn.create({ identifier: normalizedEmail });
        if (result.error) {
          setError(getClerkErrorMessage(result.error, 'We could not find that parent account. Check the email or create an account.'));
          return;
        }

        const strategies = getFactorStrategies(signIn.supportedFirstFactors);
        if (strategies.includes('password')) {
          setSignInFactor('password');
          setStep('factor');
        } else if (strategies.includes('email_code')) {
          await sendSignInCode();
        } else if (strategies.includes('email_link')) {
          await sendSignInLink();
        } else {
          setError('This account does not have a supported sign-in method enabled.');
        }
      } else {
        const result = await signUp.create({ emailAddress: normalizedEmail });
        if (result.error) {
          setError(getClerkErrorMessage(result.error, 'We could not create the account. Please check your details and try again.'));
          return;
        }
        setEmail(normalizedEmail);
        setPassword('');
        setShowPassword(false);
        setStep('signUpPassword');
        setNotice('Choose a password to protect your calm library.');
      }
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUpPasswordContinue = async () => {
    if (busy || password.length < 8) {
      if (password.length < 8) setError('Choose a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await signUp.password({ emailAddress: email, password });
      if (result.error) {
        setError(getClerkErrorMessage(result.error, 'We could not set that password. Please try again.'));
        return;
      }
      const strategies = signUp.verifications.emailAddress.supportedStrategies || [];
      if (strategies.includes('email_code')) {
        await sendSignUpCode();
      } else if (strategies.includes('email_link')) {
        await sendSignUpLink();
      } else if (signUp.status === 'complete') {
        await finalizeSignUp();
      } else {
        setError('Email verification is not available for this account yet.');
      }
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not set that password. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (busy || !password) {
      if (!password) setError('Enter your password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.password({ password });
      if (result.error) {
        setError(getClerkErrorMessage(result.error, 'That password did not work. Please try again.'));
        return;
      }
      await finalizeSignIn();
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not sign you in. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (busy || code.trim().length < 4) {
      if (code.trim().length < 4) setError('Enter the verification code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = mode === 'signIn'
        ? await signIn.emailCode.verifyCode({ code: code.trim() })
        : await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (result.error) {
        setError(getClerkErrorMessage(result.error, 'That code did not work. Check it and try again.'));
        return;
      }
      if (mode === 'signIn') await finalizeSignIn();
      else await finalizeSignUp();
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not verify that code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') await sendSignInCode();
      else await sendSignUpCode();
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not resend the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResendResetCode = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendResetPasswordCode();
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not resend the reset code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleUseAlternateFactor = async (nextFactor: SignInFactor | SignUpFactor) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') {
        if (nextFactor === 'emailCode') await sendSignInCode();
        if (nextFactor === 'emailLink') await sendSignInLink();
        if (nextFactor === 'password') {
          setSignInFactor('password');
          setStep('factor');
          setNotice(null);
        }
      } else {
        if (nextFactor === 'emailCode') await sendSignUpCode();
        if (nextFactor === 'emailLink') await sendSignUpLink();
      }
    } catch (caughtError) {
      setError(getClerkErrorMessage(caughtError, 'We could not change the verification method. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (busy) return;
    if (step === 'forgotPasswordCode' || step === 'resetPassword') setStep('factor');
    else if (step === 'signUpPassword') setStep('entry');
    else setStep('entry');
    setCode('');
    setPassword('');
    setError(null);
    setNotice(null);
  };

  const subtitle = 'Sync your calm library across devices.';

  return (
    <View style={styles.background}>
      <Image
        source={BOTANICAL_BACKGROUND}
        style={styles.backgroundImage}
        resizeMode="cover"
        pointerEvents="none"
        accessible={false}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.frame}>
            <View
              style={[
                styles.authSheet,
                isWide && styles.authSheetWide,
                { width: isWide ? Math.min(Math.max(width - 48, 0), 1100) : Math.max(width - 24, 0) },
              ]}
            >
              <View style={[styles.sheetHeader, isWide && styles.sheetHeaderWide]}>
                <AuthWordmark wide={isWide} />
                <PressableScale
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close authentication"
                  haptic="light"
                >
                  <Ionicons name="close" size={22} color={CalmColors.textPrimary} />
                </PressableScale>
              </View>

              <ScrollView
                contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.shell, isWide && styles.shellWide]}>
                  {step !== 'entry' && (
                    <PressableScale
                      onPress={handleBack}
                      style={styles.backButton}
                      accessibilityRole="button"
                      accessibilityLabel="Go back"
                      haptic="light"
                    >
                      <Ionicons name="arrow-back" size={18} color={CalmColors.sageDark} />
                      <Text style={styles.backText}>Back</Text>
                    </PressableScale>
                  )}

                  {step === 'emailEntry' ? (
                    <>
                      <Text style={[styles.emailPageTitle, isWide && styles.emailPageTitleWide]}>Continue with email</Text>
                      <Text style={[styles.emailPageCopy, isWide && styles.emailPageCopyWide]}>Enter your email to sign in or create your parent account.</Text>
                    </>
                  ) : (
                    <>
                      <View style={[styles.eyebrowRow, isWide && styles.eyebrowRowWide]}>
                        <Text style={[styles.eyebrow, isWide && styles.eyebrowWide]}>Parent account</Text>
                      </View>
                      <Text style={[styles.subtitle, isWide && styles.subtitleWide]}>{subtitle}</Text>
                    </>
                  )}

                  {step === 'entry' ? (
                    <>
                      <View style={[styles.providerGroup, isWide && styles.providerGroupWide]}>
                        <ProviderButton
                          icon="logo-apple"
                          label="Continue with Apple"
                          onPress={() => void handleSSO('Apple')}
                          disabled={busy}
                          wide={isWide}
                        />
                        <View style={styles.providerDivider} />
                        <ProviderButton
                          icon="logo-google"
                          label="Continue with Google"
                          onPress={() => void handleSSO('Google')}
                          disabled={busy}
                          wide={isWide}
                        />
                      </View>

                      <View style={[styles.dividerRow, isWide && styles.dividerRowWide]}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerLabel}>or</Text>
                        <View style={styles.divider} />
                      </View>

                      <PressableScale
                        onPress={handleOpenEmailEntry}
                        disabled={busy}
                        style={[styles.emailMethodButton, isWide && styles.emailMethodButtonWide, busy && styles.disabledButton]}
                        accessibilityRole="button"
                        accessibilityLabel="Continue with email"
                        haptic="light"
                      >
                        <Ionicons name="mail-outline" size={isWide ? 32 : 19} color={CalmColors.sageDark} />
                        <Text style={[styles.emailMethodText, isWide && styles.emailMethodTextWide]}>Continue with email</Text>
                      </PressableScale>
                    </>
                  ) : step === 'emailEntry' ? (
                    <>
                      <FieldLabel label="Email address" />
                      <View style={styles.inputWrap}>
                        <Ionicons name="mail-outline" size={19} color={CalmColors.textSubtle} />
                        <TextInput
                          value={email}
                          onChangeText={(value) => {
                            setEmail(value);
                            setError(null);
                          }}
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect={false}
                          keyboardType="email-address"
                          placeholder="parent@example.com"
                          placeholderTextColor={CalmColors.textSubtle}
                          style={styles.input}
                          accessibilityLabel="Parent email address"
                          returnKeyType={mode === 'signUp' ? 'next' : 'go'}
                        />
                      </View>

                    <PrimaryButton
                      label="Continue"
                      onPress={() => void handleEmailContinue()}
                      busy={busy}
                      accessibilityLabel="Continue with email"
                    />

                    <PressableScale
                      onPress={() => handleModeChange(mode === 'signIn' ? 'signUp' : 'signIn')}
                      disabled={busy}
                      style={styles.modeSwitch}
                      accessibilityRole="button"
                      accessibilityLabel={mode === 'signIn' ? 'Create a parent account' : 'Sign in to an existing account'}
                    >
                      <Text style={styles.modeSwitchText}>
                        {mode === 'signIn' ? 'New to Zaen? ' : 'Already have an account? '}
                        <Text style={styles.modeSwitchAccent}>{mode === 'signIn' ? 'Create an account' : 'Sign in'}</Text>
                      </Text>
                    </PressableScale>
                  </>
                ) : step === 'signUpPassword' ? (
                  <>
                    <Text style={styles.stepCopy}>{notice || `Choose a password for ${email}.`}</Text>
                    <FieldLabel label="Password" />
                    <PasswordInput
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setError(null);
                      }}
                      showPassword={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                      disabled={busy}
                    />
                    <Text style={styles.helperText}>Use at least 8 characters.</Text>
                    <PrimaryButton label="Continue" onPress={() => void handleSignUpPasswordContinue()} busy={busy} accessibilityLabel="Continue to email verification" />
                  </>
                ) : step === 'factor' ? (
                  <>
                    {signInFactor === 'password' ? (
                      <>
                        <Text style={styles.stepCopy}>Enter the password for {email}.</Text>
                        <FieldLabel label="Password" />
                        <PasswordInput
                          value={password}
                          onChangeText={(value) => {
                            setPassword(value);
                            setError(null);
                          }}
                          showPassword={showPassword}
                          onToggle={() => setShowPassword((current) => !current)}
                          disabled={busy}
                        />
                        <PrimaryButton label="Sign in" onPress={() => void handlePasswordSubmit()} busy={busy} accessibilityLabel="Sign in" />
                        <PressableScale onPress={() => void handleForgotPassword()} disabled={busy} style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Forgot password">
                          <Text style={styles.secondaryLinkText}>Forgot password?</Text>
                        </PressableScale>
                        <FactorLinks
                          links={[
                            ...(canUseSignInCode ? [{ label: 'Use a verification code instead', factor: 'emailCode' as const }] : []),
                            ...(canUseSignInLink ? [{ label: 'Email me a secure sign-in link', factor: 'emailLink' as const }] : []),
                          ]}
                          onSelect={(factor) => void handleUseAlternateFactor(factor)}
                          disabled={busy}
                        />
                      </>
                    ) : null}
                  </>
                ) : step === 'forgotPasswordCode' ? (
                  <>
                    <Text style={styles.stepCopy}>{notice || `Enter the password reset code sent to ${email}.`}</Text>
                    <FieldLabel label="Password reset code" />
                    <View style={styles.inputWrap}>
                      <Ionicons name="keypad-outline" size={19} color={CalmColors.textSubtle} />
                      <TextInput
                        value={code}
                        onChangeText={(value) => {
                          setCode(value.replace(/\s/g, ''));
                          setError(null);
                        }}
                        keyboardType="number-pad"
                        placeholder="Enter your reset code"
                        placeholderTextColor={CalmColors.textSubtle}
                        style={styles.input}
                        accessibilityLabel="Password reset code"
                        maxLength={8}
                      />
                    </View>
                    <PrimaryButton label="Verify code" onPress={() => void handleResetCodeSubmit()} busy={busy} accessibilityLabel="Verify password reset code" />
                    <PressableScale onPress={() => void handleResendResetCode()} disabled={busy} style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Resend password reset code">
                      <Text style={styles.secondaryLinkText}>Resend code</Text>
                    </PressableScale>
                  </>
                ) : step === 'resetPassword' ? (
                  <>
                    <Text style={styles.stepCopy}>{notice || 'Choose a new password for your parent account.'}</Text>
                    <FieldLabel label="New password" />
                    <PasswordInput
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setError(null);
                      }}
                      showPassword={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                      disabled={busy}
                    />
                    <Text style={styles.helperText}>Use at least 8 characters.</Text>
                    <PrimaryButton label="Update password" onPress={() => void handleNewPasswordSubmit()} busy={busy} accessibilityLabel="Update password" />
                  </>
                ) : step === 'verifyCode' ? (
                  <>
                    <Text style={styles.stepCopy}>{notice || `Enter the verification code sent to ${email}.`}</Text>
                    <FieldLabel label="Verification code" />
                    <View style={styles.inputWrap}>
                      <Ionicons name="keypad-outline" size={19} color={CalmColors.textSubtle} />
                      <TextInput
                        value={code}
                        onChangeText={(value) => {
                          setCode(value.replace(/\s/g, ''));
                          setError(null);
                        }}
                        keyboardType="number-pad"
                        placeholder="Enter your code"
                        placeholderTextColor={CalmColors.textSubtle}
                        style={styles.input}
                        accessibilityLabel="Email verification code"
                        maxLength={8}
                      />
                    </View>
                    <PrimaryButton label="Verify and continue" onPress={() => void handleCodeSubmit()} busy={busy} accessibilityLabel="Verify email code" />
                    <FactorLinks
                      links={[
                        ...(mode === 'signIn' && canUseSignInLink ? [{ label: 'Use an email link instead', factor: 'emailLink' as const }] : []),
                        ...(mode === 'signUp' && canUseSignUpLink ? [{ label: 'Use an email link instead', factor: 'emailLink' as const }] : []),
                      ]}
                      onSelect={(factor) => void handleUseAlternateFactor(factor)}
                      disabled={busy}
                    />
                    <PressableScale onPress={() => void handleResendCode()} disabled={busy} style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Resend verification code">
                      <Text style={styles.secondaryLinkText}>Resend code</Text>
                    </PressableScale>
                  </>
                ) : (
                  <>
                    <View style={styles.sentIcon}>
                      <Ionicons name="mail-open-outline" size={27} color={CalmColors.sageDark} />
                    </View>
                    <Text style={styles.stepCopy}>{notice || `Check ${email} to continue.`}</Text>
                    <Text style={styles.helperText}>The secure link will return you to Ask Zaen when verification is complete.</Text>
                    <FactorLinks
                      links={[
                        ...(mode === 'signIn' && canUseSignInCode ? [{ label: 'Use a verification code instead', factor: 'emailCode' as const }] : []),
                        ...(mode === 'signUp' && canUseSignUpCode ? [{ label: 'Use a verification code instead', factor: 'emailCode' as const }] : []),
                      ]}
                      onSelect={(factor) => void handleUseAlternateFactor(factor)}
                      disabled={busy}
                    />
                    <PressableScale onPress={handleBack} disabled={busy} style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel="Use a different email address">
                      <Text style={styles.secondaryLinkText}>Use a different email address</Text>
                    </PressableScale>
                  </>
                )}

                  {error ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text> : null}

                  {step === 'signUpPassword' ? (
                    <LegalLinks onOpenLegal={openLegal} showAgreement={step === 'signUpPassword'} />
                  ) : null}

                  {step === 'entry' ? (
                    <>
                      <PressableScale
                        onPress={onClose}
                        disabled={busy}
                        style={[styles.guestButton, isWide && styles.guestButtonWide]}
                        accessibilityRole="button"
                        accessibilityLabel="Continue as guest"
                        haptic="light"
                      >
                        <Text style={[styles.guestButtonText, isWide && styles.guestButtonWideText]}>Continue as guest</Text>
                      </PressableScale>

                      <View style={[styles.privacyRow, isWide && styles.privacyRowWide]}>
                        <Ionicons name="shield-checkmark-outline" size={isWide ? 24 : 16} color={CalmColors.sageDark} />
                        <Text style={[styles.privacyText, isWide && styles.privacyTextWide]}>No child account or child data required.</Text>
                      </View>
                      <LegalLinks onOpenLegal={openLegal} />
                    </>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function AuthWordmark({ wide }: { wide: boolean }) {
  return (
    <View style={styles.wordmark} accessible accessibilityLabel="Ask Zaen logo">
      <Image source={BRAND_MARK} style={[styles.brandLogo, wide && styles.brandLogoWide]} resizeMode="contain" />
    </View>
  );
}

function LegalLinks({
  onOpenLegal,
  showAgreement = false,
}: {
  onOpenLegal: (path: '/legal/terms' | '/legal/privacy') => void;
  showAgreement?: boolean;
}) {
  return (
    <View style={styles.legalLinks}>
      {showAgreement ? (
        <Text style={styles.legalAgreement}>By creating an account, you agree to our</Text>
      ) : null}
      <View style={styles.legalLinkRow}>
        <PressableScale
          onPress={() => onOpenLegal('/legal/terms')}
          style={styles.legalLinkButton}
          accessibilityRole="link"
          accessibilityLabel="Read Terms of Use"
        >
          <Text style={styles.legalLinkText}>Terms of Use</Text>
        </PressableScale>
        <Text style={styles.legalLinkSeparator}>·</Text>
        <PressableScale
          onPress={() => onOpenLegal('/legal/privacy')}
          style={styles.legalLinkButton}
          accessibilityRole="link"
          accessibilityLabel="Read Privacy Policy"
        >
          <Text style={styles.legalLinkText}>Privacy Policy</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function ProviderButton({
  icon,
  label,
  onPress,
  disabled,
  wide,
}: {
  icon: 'logo-apple' | 'logo-google';
  label: string;
  onPress: () => void;
  disabled: boolean;
  wide: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.providerButton, wide && styles.providerButtonWide, disabled && styles.disabledButton]}
      accessibilityRole="button"
      accessibilityLabel={label}
      haptic="light"
    >
      <Ionicons name={icon} size={wide ? 36 : 20} color={CalmColors.textPrimary} />
      <Text style={[styles.providerText, wide && styles.providerTextWide]}>{label}</Text>
    </PressableScale>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function PasswordInput({
  value,
  onChangeText,
  showPassword,
  onToggle,
  disabled,
}: {
  value: string;
  onChangeText: (value: string) => void;
  showPassword: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name="lock-closed-outline" size={19} color={CalmColors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Your password"
        placeholderTextColor={CalmColors.textSubtle}
        style={styles.input}
        accessibilityLabel="Password"
        editable={!disabled}
        returnKeyType="go"
      />
      <Pressable onPress={onToggle} style={styles.passwordToggle} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={CalmColors.textSubtle} />
      </Pressable>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  accessibilityLabel: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={busy}
      style={[styles.primaryButton, busy && styles.disabledPrimaryButton]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      haptic="medium"
    >
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </PressableScale>
  );
}

function FactorLinks({
  links,
  onSelect,
  disabled,
}: {
  links: { label: string; factor: SignInFactor | SignUpFactor }[];
  onSelect: (factor: SignInFactor | SignUpFactor) => void;
  disabled: boolean;
}) {
  if (!links.length) return null;
  return (
    <View style={styles.factorLinks}>
      {links.map((link) => (
        <PressableScale key={link.factor} onPress={() => onSelect(link.factor)} disabled={disabled} style={styles.secondaryLink} accessibilityRole="button" accessibilityLabel={link.label}>
          <Text style={styles.secondaryLinkText}>{link.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%', alignSelf: 'stretch', backgroundColor: CalmColors.canvasPrimary },
  backgroundImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  frame: { flex: 1, width: '100%', alignItems: 'center' },
  authSheet: { flex: 1, minHeight: 0, width: '100%', maxWidth: 1100, zIndex: 1, backgroundColor: 'transparent', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  authSheetWide: { borderTopLeftRadius: 64, borderTopRightRadius: 64 },
  sheetHeader: { minHeight: 82, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  sheetHeaderWide: { minHeight: 144 },
  wordmark: { alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: 46, height: 46 },
  brandLogoWide: { width: 68, height: 68 },
  closeButton: { position: 'absolute', top: 18, right: 18, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.78)' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  scrollContentWide: { paddingTop: 20 },
  shell: { width: '100%', alignSelf: 'center' },
  shellWide: { maxWidth: 824 },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 14 },
  eyebrowRow: { marginBottom: 10 },
  eyebrowRowWide: { marginBottom: 16 },
  eyebrow: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 14, letterSpacing: 0.2 },
  eyebrowWide: { fontSize: 30 },
  subtitle: { color: CalmColors.textPrimary, fontFamily: 'Quicksand_700Bold', fontSize: 28, lineHeight: 33, marginTop: 0, maxWidth: 340 },
  subtitleWide: { fontSize: 58, lineHeight: 66, maxWidth: 760 },
  emailPageTitle: { color: CalmColors.textPrimary, fontFamily: 'Quicksand_700Bold', fontSize: 30, lineHeight: 36, marginTop: 4 },
  emailPageTitleWide: { fontSize: 44, lineHeight: 52 },
  emailPageCopy: { color: CalmColors.textMuted, fontFamily: 'Quicksand_600SemiBold', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 420 },
  emailPageCopyWide: { fontSize: 18, lineHeight: 27, marginTop: 14, maxWidth: 640 },
  providerGroup: { marginTop: 26, overflow: 'hidden', borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.78)', borderWidth: 1, borderColor: '#E7D8C4' },
  providerGroupWide: { marginTop: 56, borderRadius: 40 },
  providerButton: { minHeight: 56, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  providerButtonWide: { minHeight: 112, paddingHorizontal: 32 },
  providerDivider: { height: 1, marginHorizontal: 32, backgroundColor: '#E7D8C4' },
  providerText: { color: CalmColors.textPrimary, fontFamily: 'Quicksand_700Bold', fontSize: 16 },
  providerTextWide: { fontSize: 30 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerRowWide: { marginVertical: 32 },
  divider: { flex: 1, height: 1, backgroundColor: CalmColors.divider },
  dividerLabel: { color: CalmColors.terracottaDark, fontFamily: 'Quicksand_700Bold', fontSize: 14 },
  emailMethodButton: { minHeight: 56, borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.46)', borderWidth: 1, borderColor: '#D8CCB6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  emailMethodButtonWide: { minHeight: 112, borderRadius: 40, paddingHorizontal: 32 },
  emailMethodText: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 16 },
  emailMethodTextWide: { fontSize: 30 },
  fieldLabel: { color: CalmColors.textPrimary, fontFamily: 'Quicksand_700Bold', fontSize: 13, marginBottom: 6, marginTop: 7 },
  inputWrap: { minHeight: 56, borderRadius: 17, borderWidth: 1, borderColor: '#D8CCB6', backgroundColor: 'rgba(255, 255, 255, 0.72)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, minHeight: 48, color: CalmColors.textPrimary, fontFamily: 'Quicksand_600SemiBold', fontSize: 15, outlineStyle: 'none' } as any,
  passwordToggle: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  helperText: { color: CalmColors.textSubtle, fontFamily: 'Quicksand_600SemiBold', fontSize: 12, marginTop: 6 },
  primaryButton: { minHeight: 50, borderRadius: 16, backgroundColor: CalmColors.terracotta, alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Quicksand_700Bold', fontSize: 15 },
  disabledButton: { opacity: 0.56 },
  disabledPrimaryButton: { opacity: 0.7 },
  modeSwitch: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 10 },
  modeSwitchText: { color: CalmColors.textMuted, fontFamily: 'Quicksand_600SemiBold', fontSize: 13, textAlign: 'center' },
  modeSwitchAccent: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', textDecorationLine: 'underline' },
  guestButton: { minHeight: 44, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 18 },
  guestButtonText: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 15 },
  guestButtonWide: { minHeight: 56, marginTop: 32 },
  guestButtonWideText: { fontSize: 24 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 2 },
  privacyText: { flex: 1, color: CalmColors.textSubtle, fontFamily: 'Quicksand_600SemiBold', fontSize: 11.5, lineHeight: 16 },
  privacyRowWide: { marginTop: 40, alignSelf: 'center' },
  privacyTextWide: { fontSize: 16, lineHeight: 22 },
  legalLinks: { alignItems: 'center', marginTop: 14, paddingHorizontal: 4 },
  legalAgreement: { color: CalmColors.textSubtle, fontFamily: 'Quicksand_600SemiBold', fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 2 },
  legalLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  legalLinkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  legalLinkText: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 11, textDecorationLine: 'underline' },
  legalLinkSeparator: { color: CalmColors.textSubtle, fontFamily: 'Quicksand_600SemiBold', fontSize: 12, marginHorizontal: 2 },
  errorText: { color: '#A44E3A', backgroundColor: 'rgba(164, 78, 58, 0.09)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12, fontFamily: 'Quicksand_600SemiBold', fontSize: 13, lineHeight: 18 },
  stepCopy: { color: CalmColors.textMuted, fontFamily: 'Quicksand_600SemiBold', fontSize: 14, lineHeight: 21, marginTop: 16, maxWidth: 620 },
  factorLinks: { gap: 0, marginTop: 8 },
  secondaryLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  secondaryLinkText: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 13, textDecorationLine: 'underline' },
  sentIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: CalmColors.sageSoft, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 4 },
});
