import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, shadows } from '../theme/colors';

const FAQS = [
  {
    q: 'How does Pricely compare prices?',
    a: 'Pricely automatically crawls major e-commerce platforms in Pakistan (Daraz, Telemart, Mega.pk, Amazon) to find and display the lowest prices for products in real-time.',
  },
  {
    q: 'Can I get notified of price drops?',
    a: 'Yes, just click on any product, click the Set Alert button, and define your target price threshold. We will trigger push notifications as soon as a match occurs.',
  },
  {
    q: 'Why are some prices mismatched?',
    a: 'E-commerce platforms change prices frequently. While we sync rates continuously, there might be brief latency. You can use the form below to report wrong matches to help us sync faster!',
  },
];

export default function HelpSupportScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [showReportForm, setShowReportForm] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Form states
  const [productName, setProductName] = useState('');
  const [wrongPrice, setWrongPrice] = useState('');
  const [storeName, setStoreName] = useState('');

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  useEffect(() => {
    if (route.params?.reportIssue) {
      setShowReportForm(true);
    }
  }, [route.params?.reportIssue]);

  const handleSubmitReport = () => {
    if (!productName || !wrongPrice || !storeName) {
      Alert.alert('Fields Required', 'Please fill all details to help us investigate.');
      return;
    }
    Alert.alert('Report Submitted', 'Thank you! Our system will audit the price data for this item.');
    setProductName('');
    setWrongPrice('');
    setStoreName('');
    setShowReportForm(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Toggle issue report form */}
        <TouchableOpacity
          style={styles.reportToggleBtn}
          onPress={() => setShowReportForm(!showReportForm)}
        >
          <Ionicons name={showReportForm ? "chatbubbles" : "alert-circle"} size={22} color="#FFFFFF" />
          <Text style={styles.reportToggleText}>
            {showReportForm ? 'Show FAQs & Guidelines' : 'Report Wrong Price Match'}
          </Text>
        </TouchableOpacity>

        {showReportForm ? (
          /* Report Form View */
          <View style={styles.card}>
            <Text style={styles.formTitle}>Report Price Mismatch</Text>
            <Text style={styles.formSubtitle}>
              Let us know if you spot any incorrect catalog listings or prices from our store partners.
            </Text>

            <Text style={styles.inputLabel}>Product name</Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Redmi Note 13 8/256"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Incorrect price listed</Text>
            <TextInput
              value={wrongPrice}
              onChangeText={setWrongPrice}
              placeholder="e.g. Listed Rs 55,000 but is Rs 58,000"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Store website</Text>
            <TextInput
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Daraz / Telemart"
              style={styles.input}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReport}>
              <Text style={styles.submitBtnText}>Submit Mismatch Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* FAQs View */
          <>
            <Text style={styles.sectionHeader}>Frequently Asked Questions</Text>
            <View style={styles.faqBlock}>
              {FAQS.map((faq, i) => {
                const open = expandedFaq === i;
                return (
                  <View key={i} style={styles.faqRow}>
                    <TouchableOpacity
                      style={styles.faqHeader}
                      onPress={() => setExpandedFaq(open ? null : i)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestion}>{faq.q}</Text>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {open && (
                      <View style={styles.faqAnswerContainer}>
                        <Text style={styles.faqAnswer}>{faq.a}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionHeader}>Need More Help?</Text>
            <View style={styles.card}>
              <View style={styles.supportChannel}>
                <Ionicons name="mail" size={24} color="#0E6B4F" />
                <View style={styles.supportTextWrap}>
                  <Text style={styles.supportTitle}>Email Support</Text>
                  <Text style={styles.supportSubtitle}>support@pricely.pk</Text>
                </View>
              </View>
              <View style={styles.supportChannel}>
                <Ionicons name="logo-whatsapp" size={24} color="#0E6B4F" />
                <View style={styles.supportTextWrap}>
                  <Text style={styles.supportTitle}>WhatsApp Help Desk</Text>
                  <Text style={styles.supportSubtitle}>+92 300 1234567</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radii.small,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  reportToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E6B4F',
    borderRadius: radii.medium,
    paddingVertical: 14,
    marginBottom: 20,
    ...shadows.button,
  },
  reportToggleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.button,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  faqBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
    ...shadows.card,
  },
  faqRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: fonts.label,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.card,
  },
  formTitle: {
    fontSize: 17,
    fontFamily: fonts.headlineBold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.label,
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small - 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.body,
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#0E6B4F',
    borderRadius: radii.small,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.button,
    fontSize: 14,
  },
  supportChannel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  supportTextWrap: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontFamily: fonts.label,
    color: colors.textPrimary,
  },
  supportSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
