import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UtilityIcon } from '@/components/praybor/PrayborArtwork';
import { Colors } from '@/constants/theme';
import {
  REPORT_REASONS,
  type PrayerReportReason,
} from '@/lib/praybor/content-safety';

type PrayerReportModalProps = {
  authorLabel?: string;
  canBlockAuthor: boolean;
  onClose: () => void;
  onSubmit: (input: {
    blockAuthor: boolean;
    details: string;
    reason: PrayerReportReason;
  }) => Promise<void> | void;
  prayerTitle?: string;
  visible: boolean;
};

const colors = Colors.light;

export function PrayerReportModal({
  authorLabel,
  canBlockAuthor,
  onClose,
  onSubmit,
  prayerTitle,
  visible,
}: PrayerReportModalProps) {
  const [blockAuthor, setBlockAuthor] = useState(false);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<PrayerReportReason>('harassment');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setBlockAuthor(false);
      setDetails('');
      setError(null);
      setReason('harassment');
      setSubmitting(false);
    }
  }, [visible]);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ blockAuthor, details, reason });
      onClose();
    } catch (submitError) {
      console.warn('Could not submit prayer report.', submitError);
      setError('Could not save this report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close report form"
          onPress={onClose}
          style={styles.scrim}
        />
        <SafeAreaView pointerEvents="box-none" style={styles.safe}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.titleIcon}>
                <UtilityIcon type="siren" size={22} color="#FF6628" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Report prayer</Text>
                <Text numberOfLines={2} style={styles.subtitle}>
                  {prayerTitle ?? 'This prayer'} will be hidden from your view.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close report form"
                onPress={onClose}
                style={styles.closeButton}>
                <UtilityIcon type="close" size={19} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Reason</Text>
              <View style={styles.reasonGrid}>
                {REPORT_REASONS.map((item) => {
                  const selected = reason === item.id;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={item.id}
                      onPress={() => setReason(item.id)}
                      style={[
                        styles.reasonButton,
                        selected && styles.reasonButtonSelected,
                      ]}>
                      <Text
                        style={[
                          styles.reasonText,
                          selected && styles.reasonTextSelected,
                        ]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Details</Text>
              <TextInput
                multiline
                onChangeText={setDetails}
                placeholder="Add a short note for review."
                placeholderTextColor="rgba(42, 28, 19, 0.42)"
                style={styles.detailsInput}
                value={details}
              />

              {canBlockAuthor ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: blockAuthor }}
                  onPress={() => setBlockAuthor((current) => !current)}
                  style={styles.blockRow}>
                  <View style={[styles.checkbox, blockAuthor && styles.checkboxChecked]}>
                    {blockAuthor ? <UtilityIcon type="check" size={15} color="#FFFFFF" /> : null}
                  </View>
                  <View style={styles.blockCopy}>
                    <Text style={styles.blockTitle}>Block this author</Text>
                    <Text style={styles.blockText}>
                      Future prayers from {authorLabel ?? 'this author'} will be hidden.
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting }}
                disabled={submitting}
                onPress={submit}
                style={[styles.submitButton, submitting && styles.disabledButton]}>
                <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Submit report'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 28, 19, 0.24)',
  },
  safe: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '86%',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(42, 28, 19, 0.14)',
    borderRadius: 999,
    height: 5,
    marginBottom: 15,
    width: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  titleIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF1CC',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  content: {
    paddingBottom: 24,
    paddingTop: 18,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 9,
    textTransform: 'uppercase',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  reasonButton: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(42, 28, 19, 0.08)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonButtonSelected: {
    backgroundColor: '#FF6628',
    borderColor: '#FF6628',
  },
  reasonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  reasonTextSelected: {
    color: '#2a1c13',
  },
  detailsInput: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(42, 28, 19, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 13,
    textAlignVertical: 'top',
  },
  blockRow: {
    alignItems: 'center',
    backgroundColor: '#FFF1CC',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 13,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(42, 28, 19, 0.18)',
    borderRadius: 9,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkboxChecked: {
    backgroundColor: '#FF6628',
    borderColor: '#FF6628',
  },
  blockCopy: {
    flex: 1,
  },
  blockTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  blockText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
  errorText: {
    color: '#D9472B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#FF6628',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.55,
  },
  submitText: {
    color: '#2a1c13',
    fontSize: 15,
    fontWeight: '900',
  },
});
