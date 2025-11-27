import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type HelpScreenProps = NativeStackScreenProps<RootStackParamList, 'Help'>;

const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>

        <TouchableOpacity
          style={styles.linkItem}
          onPress={() => handleOpenLink('https://docs.ecode.dev')}
        >
          <Text style={styles.linkIcon}>📚</Text>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Documentation</Text>
            <Text style={styles.linkSubtitle}>Learn how to use E-Code</Text>
          </View>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkItem}
          onPress={() => handleOpenLink('https://ecode.dev/tutorials')}
        >
          <Text style={styles.linkIcon}>🎓</Text>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Tutorials</Text>
            <Text style={styles.linkSubtitle}>Step-by-step guides</Text>
          </View>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkItem}
          onPress={() => handleOpenLink('https://community.ecode.dev')}
        >
          <Text style={styles.linkIcon}>💬</Text>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Community</Text>
            <Text style={styles.linkSubtitle}>Join our community</Text>
          </View>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkItem}
          onPress={() => handleOpenLink('https://status.ecode.dev')}
        >
          <Text style={styles.linkIcon}>🟢</Text>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Status Page</Text>
            <Text style={styles.linkSubtitle}>Check system status</Text>
          </View>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I create a new project?</Text>
          <Text style={styles.faqAnswer}>
            Tap the "+" button on the home screen, choose a template, and give your project a name.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I work offline?</Text>
          <Text style={styles.faqAnswer}>
            Yes! Enable offline mode in Settings. Your changes will sync when you're back online.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I invite collaborators?</Text>
          <Text style={styles.faqAnswer}>
            Open your project, go to Collaboration tab, and tap "Invite Collaborator".
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Where are my files stored?</Text>
          <Text style={styles.faqAnswer}>
            Files are securely stored in the cloud and cached locally for offline access.
          </Text>
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Support</Text>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => handleOpenLink('mailto:support@ecode.dev')}
        >
          <Text style={styles.supportButtonText}>📧 Email Support</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => handleOpenLink('https://github.com/ecode/issues')}
        >
          <Text style={styles.supportButtonText}>🐛 Report a Bug</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => handleOpenLink('https://ecode.dev/feedback')}
        >
          <Text style={styles.supportButtonText}>💡 Send Feedback</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>E-Code Mobile v1.0.0</Text>
        <Text style={styles.footerSubtext}>© 2025 E-Code Team</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  },
  content: {
    padding: mobileSpacing.md,
    paddingBottom: mobileSpacing.xl
  },
  section: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    borderWidth: 1,
    borderColor: mobileColors.border,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.lg
  },
  sectionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: mobileSpacing.md
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border
  },
  linkIcon: {
    fontSize: 24,
    marginRight: mobileSpacing.md
  },
  linkInfo: {
    flex: 1
  },
  linkTitle: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: 2
  },
  linkSubtitle: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary
  },
  linkArrow: {
    fontSize: 24,
    color: mobileColors.textMuted,
    fontWeight: '300'
  },
  faqItem: {
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border
  },
  faqQuestion: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: mobileSpacing.xs
  },
  faqAnswer: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    lineHeight: 20
  },
  supportButton: {
    paddingVertical: mobileSpacing.md,
    backgroundColor: mobileColors.background,
    borderRadius: mobileBorderRadius.md,
    borderWidth: 1,
    borderColor: mobileColors.border,
    alignItems: 'center',
    marginBottom: mobileSpacing.sm
  },
  supportButtonText: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text
  },
  footer: {
    alignItems: 'center',
    paddingVertical: mobileSpacing.xl,
    marginTop: mobileSpacing.lg
  },
  footerText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.textSecondary,
    marginBottom: 4
  },
  footerSubtext: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted
  }
});

export default HelpScreen;
