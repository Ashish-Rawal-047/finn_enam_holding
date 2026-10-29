import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LightColors, DarkColors } from '../../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isDark?: boolean;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  isDark = false,
}) => {
  const colors = isDark ? DarkColors : LightColors;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Grab handle */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? '#2D4A3C' : '#D5CFC2' },
                ]}
              />
            </View>

            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.titleArea}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.textPrimary },
                  ]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    style={[
                      styles.subtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeButton,
                  { backgroundColor: isDark ? '#1C3B2E' : '#E5EEE5' },
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close sheet"
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={isDark ? colors.textPrimary : colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {footer && (
              <SafeAreaView
                style={[
                  styles.footerContainer,
                  {
                    borderTopColor: colors.borderSubtle,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {footer}
              </SafeAreaView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 33, 25, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrapper: {
    maxHeight: '90%',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#102A1F',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.tiny,
    marginTop: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    paddingHorizontal: 20,
    maxHeight: 440,
    flexShrink: 1,
  },
  contentContainer: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
});
