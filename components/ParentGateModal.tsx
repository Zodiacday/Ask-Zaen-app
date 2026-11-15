import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { triggerHaptic } from '@/constants/haptics';

interface ParentGateModalProps {
  visible: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

interface MathProblem {
  numA: number;
  numB: number;
  answer: number;
  options: number[];
}

function generateProblem(): MathProblem {
  const numA = Math.floor(Math.random() * 7) + 3; // 3 - 9
  const numB = Math.floor(Math.random() * 7) + 3; // 3 - 9
  const answer = numA + numB;

  const distractors = new Set<number>();
  const deltas = [-2, -1, 1, 2, 3, -3];

  while (distractors.size < 3) {
    const randomDelta = deltas[Math.floor(Math.random() * deltas.length)];
    const cand = answer + randomDelta;
    if (cand > 0 && cand !== answer) {
      distractors.add(cand);
    }
  }

  const all = [answer, ...Array.from(distractors)];
  // Shuffle options
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return {
    numA,
    numB,
    answer,
    options: all,
  };
}

export const ParentGateModal: React.FC<ParentGateModalProps> = ({
  visible,
  onSuccess,
  onClose,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [problem, setProblem] = useState<MathProblem>(generateProblem);
  const [selectedWrong, setSelectedWrong] = useState<number | null>(null);
  const [solved, setSolved] = useState<boolean>(false);
  const [shakeAnim] = useState(() => new Animated.Value(0));

  // Reset problem whenever modal opens
  useEffect(() => {
    if (visible) {
      const resetId = setTimeout(() => {
        setProblem(generateProblem());
        setSelectedWrong(null);
        setSolved(false);
      }, 0);
      return () => clearTimeout(resetId);
    }
  }, [visible]);

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [shakeAnim]);

  const handleSelectOption = useCallback(
    (choice: number) => {
      if (choice === problem.answer) {
        triggerHaptic('success');
        setSolved(true);
        setSelectedWrong(null);
        setTimeout(() => {
          onSuccess();
        }, 220);
      } else {
        triggerHaptic('heavy');
        setSelectedWrong(choice);
        triggerShake();
        // Generate new question on failure to prevent repeated guessing
        setTimeout(() => {
          setProblem(generateProblem());
          setSelectedWrong(null);
        }, 500);
      }
    },
    [problem.answer, onSuccess, triggerShake]
  );

  if (!visible) return null;

  const cardWidth = Math.min(windowWidth - 48, 360);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Animated Container for Shake on Wrong Answer */}
        <Animated.View
          style={[
            styles.card,
            { width: cardWidth },
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Top Bar with Close Button */}
          <View style={styles.topRow}>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={16} color={CalmColors.sageDark} />
              <Text style={styles.lockBadgeText}>GROWN-UPS ONLY</Text>
            </View>

            <PressableScale
              style={styles.closeBtn}
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              scaleTo={0.9}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={19} color={CalmColors.textMuted} />
            </PressableScale>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Parent Sanctuary Gate</Text>
          <Text style={styles.subtitle}>
            {selectedWrong !== null
              ? 'Oops! Try this one:'
              : 'Answer this quick math check to enter Settings:'}
          </Text>

          {/* Math Expression Box */}
          <View style={styles.mathEquationBox}>
            <Text style={styles.equationText}>
              {problem.numA} + {problem.numB} = ?
            </Text>
          </View>

          {/* 4 Choice Buttons */}
          <View style={styles.optionsGrid}>
            {problem.options.map((opt) => {
              const isCorrectAndSolved = solved && opt === problem.answer;
              const isIncorrect = selectedWrong === opt;

              return (
                <PressableScale
                  key={opt}
                  style={[
                    styles.optionBtn,
                    isCorrectAndSolved && styles.optionBtnCorrect,
                    isIncorrect && styles.optionBtnWrong,
                  ]}
                  onPress={() => handleSelectOption(opt)}
                  scaleTo={0.96}
                  haptic="selection"
                  disabled={solved}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isCorrectAndSolved && styles.optionTextCorrect,
                      isIncorrect && styles.optionTextWrong,
                    ]}
                  >
                    {opt}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Reassuring Calm Footnote */}
          <Text style={styles.footnote}>
            Prevents little fingers from changing quiet settings.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 35, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: CalmColors.canvasPrimary,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: CalmColors.divider,
    shadowColor: 'rgba(74, 63, 56, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 124, 89, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  lockBadgeText: {
    fontSize: 11,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.sageDark,
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CalmColors.surfaceGlass,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  mathEquationBox: {
    backgroundColor: '#F3EFEA',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(107, 124, 89, 0.18)',
  },
  equationText: {
    fontSize: 26,
    fontFamily: 'Fredoka_700Bold',
    color: CalmColors.textPrimary,
    letterSpacing: 1.5,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionBtn: {
    width: '47%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1.5,
    borderColor: CalmColors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBtnCorrect: {
    backgroundColor: '#E6EFE2',
    borderColor: CalmColors.sageDark,
  },
  optionBtnWrong: {
    backgroundColor: '#FBECEB',
    borderColor: '#D9534F',
  },
  optionText: {
    fontSize: 20,
    fontFamily: 'Fredoka_600SemiBold',
    color: CalmColors.textPrimary,
  },
  optionTextCorrect: {
    color: CalmColors.sageDark,
  },
  optionTextWrong: {
    color: '#D9534F',
  },
  footnote: {
    fontSize: 11.5,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
