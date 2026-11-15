import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CalmColors } from '@/constants/Colors';

type LegalDocument = 'terms' | 'privacy';

type Section = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const DOCUMENTS: Record<LegalDocument, { title: string; intro: string; sections: Section[] }> = {
  terms: {
    title: 'Terms of Use',
    intro: 'Ask Zaen helps parents explore and organize calm, age-appropriate media. These terms apply to the Ask Zaen app, website, and related services.',
    sections: [
      {
        title: 'About Ask Zaen',
        paragraphs: [
          'Ask Zaen is operated by Natan Selomon, an independent developer. Questions about the service can be sent to asteriuselos@gmail.com.',
        ],
      },
      {
        title: 'Parent-facing service',
        paragraphs: [
          'Ask Zaen is designed for parents and adult caregivers. Accounts are parent accounts only. Ask Zaen does not create child accounts and does not require a child’s name, exact birth date, location, or other child personal information.',
          'You are responsible for making sure you can legally accept these Terms and for supervising any child who uses or watches content reached through the service.',
        ],
      },
      {
        title: 'Guest use and accounts',
        paragraphs: [
          'You may browse public media as a guest. An account is optional for browsing and lets you sync parent preferences, saved titles, and playlists across devices.',
          'Authentication may use Clerk, Apple, or Google. Keep your account access secure and contact us if you believe it has been used without permission. You can request account deletion through the in-app account controls.',
        ],
      },
      {
        title: 'What Ask Zaen provides',
        paragraphs: [
          'Ask Zaen provides curated information, organization tools, and links intended to help parents explore calm and age-appropriate media.',
          'Ask Zaen is not medical, psychological, therapeutic, healthcare, childcare, or professional educational advice. Labels, age guidance, stimulation scores, safety tags, and recommendations are general curation signals only and are not a guarantee of suitability, safety, availability, accuracy, or educational benefit.',
        ],
      },
      {
        title: 'Third-party media and links',
        paragraphs: [
          'Ask Zaen may help you open third-party services such as YouTube or other media platforms. Those services have their own terms, privacy practices, content, advertisements, availability, and parental controls.',
          'When you leave Ask Zaen, the third party is responsible for its service and content. Review its terms and privacy policy and use its parental controls where appropriate.',
          'Ask Zaen does not currently sell products, operate a marketplace, process toy purchases, or receive affiliate commissions. Future product or affiliate features will have separate disclosures and terms.',
        ],
      },
      {
        title: 'Your responsibility',
        bullets: [
          'Deciding whether media is appropriate for your child.',
          'Checking content, ratings, language, themes, and external-service settings.',
          'Supervising external media services and links.',
          'Configuring devices and accounts appropriately for your family.',
          'Using the service in compliance with applicable law.',
        ],
      },
      {
        title: 'Acceptable use',
        paragraphs: ['You must not use Ask Zaen unlawfully, attempt unauthorized access, interfere with the service, bypass security, scrape or commercially exploit the service except where permitted by law, submit information you do not have the right to submit, or create child profiles or child personal-data records.'],
      },
      {
        title: 'Content and intellectual property',
        paragraphs: [
          'Ask Zaen software, design, branding, text, curation structure, and original materials are owned by or licensed to Natan Selomon. Third-party names, logos, media, and links belong to their respective owners.',
          'Subject to these Terms, you receive a limited, personal, non-exclusive, non-transferable, revocable right to use Ask Zaen for its intended parent-facing purpose.',
        ],
      },
      {
        title: 'Availability and changes',
        paragraphs: ['We may update, suspend, restrict, or discontinue parts of the service, including media listings, categories, external links, account features, or synchronization features, for maintenance, safety, legal, security, technical, or business reasons. We do not promise that every listing, link, or piece of media will remain available or accurate at all times.'],
      },
      {
        title: 'Disclaimers and liability',
        paragraphs: [
          'To the maximum extent permitted by applicable law, Ask Zaen is provided on an “as available” basis without guarantees that it will be uninterrupted, error-free, complete, current, or suitable for every family or child.',
          'Nothing in these Terms excludes or limits rights, remedies, guarantees, or liability that cannot legally be excluded or limited. To the maximum extent permitted by law, Natan Selomon is not responsible for losses arising from a parent’s suitability decision, a third-party service, third-party media, an external link, or a failure to supervise a child.',
        ],
      },
      {
        title: 'Suspension and termination',
        paragraphs: ['We may suspend or terminate access where reasonably necessary to protect the service, users, third parties, or legal compliance, including for serious or repeated violations of these Terms. You may stop using Ask Zaen at any time and request account deletion through the in-app account controls.'],
      },
      {
        title: 'Governing law and consumer rights',
        paragraphs: ['These Terms are governed by the laws of Sweden, without preventing you from relying on mandatory consumer protections that apply in the country where you live. Nothing in these Terms removes rights that cannot lawfully be waived. Please contact asteriuselos@gmail.com before bringing a claim so we can try to resolve the issue.'],
      },
      {
        title: 'Changes and contact',
        paragraphs: ['We may update these Terms when the service, law, or safety requirements change. The updated version will show a new effective date. Ask Zaen is operated by Natan Selomon. Contact: asteriuselos@gmail.com.'],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains how Ask Zaen handles information when you browse as a guest or use a parent account.',
    sections: [
      {
        title: 'Who is responsible for your data',
        paragraphs: ['Ask Zaen is operated by Natan Selomon, an independent developer. For privacy questions or requests, contact asteriuselos@gmail.com.'],
      },
      {
        title: 'Information we may process',
        bullets: [
          'An account identifier from the authentication provider.',
          'Your name or display name, if the provider makes it available.',
          'Your email address, including an Apple private relay address where applicable.',
          'Sign-in and session information needed to authenticate you.',
          'Preferences such as language, age tier, and selected subscriptions or channels.',
          'Saved media IDs and playlist information, including titles, emoji, and ordering.',
          'State revisions and update timestamps used to synchronize your data safely.',
        ],
        paragraphs: ['Guest browsing does not require an account. We do not intentionally request or require a child’s name, exact birth date, location, device identifier, or child account.'],
      },
      {
        title: 'Technical information',
        paragraphs: ['Depending on the final server and SDK configuration, Ask Zaen and its providers may process technical information needed for operation and security, such as IP address, request timestamps, browser or device information, crash information, and security or diagnostic logs. We do not use technical data to build child profiles.'],
      },
      {
        title: 'How we use information',
        bullets: [
          'Provide sign-in, account recovery, and session management.',
          'Synchronize preferences, saved titles, and playlists across devices.',
          'Prevent unauthorized access, abuse, fraud, and security incidents.',
          'Respond to support requests and maintain service reliability.',
          'Comply with legal obligations and enforce our Terms of Use.',
        ],
        paragraphs: ['We do not sell personal data or use account data to create behavioral profiles of children or deliver behavioral advertising to children.'],
      },
      {
        title: 'Legal bases',
        paragraphs: ['Where the GDPR applies, we generally rely on performance of a contract for account and synchronization features; legitimate interests for security, abuse prevention, reliability, and support; legal obligations where required; and consent where legally required for a specific optional activity.'],
      },
      {
        title: 'Providers and sharing',
        paragraphs: ['We may share the minimum necessary information with Clerk for authentication and account metadata; hosting, infrastructure, and security providers; Apple or Google when you choose their sign-in method; and external media services when you choose to open a third-party link. Providers may process data outside Sweden or the European Economic Area.'],
      },
      {
        title: 'Children’s privacy',
        paragraphs: ['Ask Zaen is designed for parents and caregivers rather than child accounts. We do not intentionally collect personal information directly from children. Parents should not enter child names, exact birth dates, locations, health information, or other child personal information into account fields, playlist titles, support requests, or free-text areas. Contact asteriuselos@gmail.com if you believe child data was submitted.'],
      },
      {
        title: 'Retention and deletion',
        paragraphs: ['We retain account and synchronized state while your account is active or as needed to provide the service. When you delete your account, we delete or de-identify the account data and Ask Zaen state we control, except where limited retention is required for legal obligations, security, fraud prevention, dispute resolution, or backup integrity. Technical and security logs are retained only as reasonably necessary for their purpose.'],
      },
      {
        title: 'Your rights',
        paragraphs: ['Depending on where you live and which law applies, you may have rights to access, correct, delete, restrict, object to, or port your personal data; withdraw consent; and complain to a supervisory authority. To make a request, email asteriuselos@gmail.com. We may need to verify your identity.'],
      },
      {
        title: 'Security and external services',
        paragraphs: ['We use reasonable measures appropriate to the data and service, but no online service can guarantee absolute security. Third-party media platforms may collect data under their own policies when you open them from Ask Zaen.'],
      },
      {
        title: 'International availability and changes',
        paragraphs: ['Ask Zaen may be available internationally. This policy provides a GDPR-aware baseline and will be supplemented by rights or notices required where you use the service. We may update it when our practices, providers, features, or legal obligations change. The updated version will show a new effective date.'],
      },
      {
        title: 'Contact',
        paragraphs: ['Ask Zaen is operated by Natan Selomon. Privacy email: asteriuselos@gmail.com.'],
      },
    ],
  },
};

export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const content = DOCUMENTS[document];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 20) }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={CalmColors.sageDark} />
        </Pressable>
        <Text style={styles.headerTitle}>{content.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.updated}>Ask Zaen · Last updated 14 November 2026</Text>
        <Text style={styles.intro}>{content.intro}</Text>

        {content.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs?.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
            ))}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}

        <Pressable
          style={styles.contactButton}
          onPress={() => void Linking.openURL('mailto:asteriuselos@gmail.com')}
          accessibilityRole="button"
          accessibilityLabel="Email Ask Zaen support"
        >
          <Ionicons name="mail-outline" size={18} color={CalmColors.sageDark} />
          <Text style={styles.contactButtonText}>Contact Ask Zaen</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CalmColors.canvasPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: CalmColors.dividerSubtle,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#E7EFE0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: CalmColors.textPrimary,
    fontFamily: 'DynaPuff_600SemiBold',
    fontSize: 17,
  },
  headerSpacer: { width: 44 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 24 },
  title: { color: CalmColors.textPrimary, fontFamily: 'DynaPuff_700Bold', fontSize: 30, lineHeight: 38 },
  updated: { color: CalmColors.textSubtle, fontFamily: 'Quicksand_600SemiBold', fontSize: 11, marginTop: 6 },
  intro: { color: CalmColors.textMuted, fontFamily: 'Quicksand_600SemiBold', fontSize: 15, lineHeight: 23, marginTop: 20 },
  section: { marginTop: 26 },
  sectionTitle: { color: CalmColors.sageDark, fontFamily: 'DynaPuff_600SemiBold', fontSize: 19, lineHeight: 26, marginBottom: 8 },
  paragraph: { color: CalmColors.textPrimary, fontFamily: 'Quicksand_600SemiBold', fontSize: 14, lineHeight: 22, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  bullet: { color: CalmColors.terracottaDark, fontFamily: 'Quicksand_700Bold', fontSize: 18, lineHeight: 21, marginRight: 8 },
  bulletText: { flex: 1, color: CalmColors.textPrimary, fontFamily: 'Quicksand_600SemiBold', fontSize: 14, lineHeight: 21 },
  contactButton: { minHeight: 52, marginTop: 30, borderRadius: 26, borderWidth: 1, borderColor: CalmColors.sageBorder, backgroundColor: '#E7EFE0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  contactButtonText: { color: CalmColors.sageDark, fontFamily: 'Quicksand_700Bold', fontSize: 14 },
});
