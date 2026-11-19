import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';

type BillCategory = 'electricity' | 'internet' | 'other';

type BillsScreenProps = {
  darkMode?: boolean;
  onSelectBill?: (category: BillCategory) => void;
};

const BillsScreen: React.FC<BillsScreenProps> = ({
  darkMode = false,
  onSelectBill,
}) => {
  const colors = darkMode
    ? {
        background: '#0D1712',
        header: '#101C16',
        card: '#101C16',
        border: '#294238',
        divider: '#22372D',
        text: '#F3F8F5',
        secondary: '#A9B8B0',
        muted: '#82958B',
        green: '#00843D',
        greenDark: '#006B32',
        iconBg: '#123A29',
        noticeBg: '#0D2A1E',
        noticeBorder: '#1C4A35',
        noticeText: '#A8C8B8',
        arrowBg: '#183126',
      }
    : {
        background: '#F6FAF8',
        header: '#FFFFFF',
        card: '#FFFFFF',
        border: '#E7EEE9',
        divider: '#E6EFEA',
        text: '#172018',
        secondary: '#7B8982',
        muted: '#98A49F',
        green: '#00843D',
        greenDark: '#006B32',
        iconBg: '#E9F3D9',
        noticeBg: '#E9F3D9',
        noticeBorder: '#D4E8C3',
        noticeText: '#356B57',
        arrowBg: '#F0F7F4',
      };

  const billOptions: {
    id: BillCategory;
    title: string;
    description: string;
    icon: string;
    iconColor: string;
  }[] = [
    {
      id: 'electricity',
      title: 'Electricity',
      description: 'Pay prepaid and postpaid electricity bills',
      icon: '⚡',
      iconColor: '#E9B900',
    },
    {
      id: 'internet',
      title: 'Internet',
      description: 'Pay internet and broadband bills',
      icon: '🌐',
      iconColor: '#2797C7',
    },
    {
      id: 'other',
      title: 'Other Bills',
      description: 'Pay other supported bills and services',
      icon: '🧾',
      iconColor: colors.green,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.header,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => onSelectBill?.('other')}
          style={[
            styles.backButton,
            { backgroundColor: colors.arrowBg },
          ]}
          activeOpacity={0.75}
        >
          <Text style={[styles.backIcon, { color: colors.green }]}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Bills
        </Text>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <View
            style={[
              styles.labelBadge,
              {
                backgroundColor: colors.iconBg,
                borderColor: colors.noticeBorder,
              },
            ]}
          >
            <Text style={[styles.labelText, { color: colors.green }]}>
              PAYMENTS
            </Text>
          </View>

          <Text style={[styles.heading, { color: colors.text }]}>
            Pay Your Bills
          </Text>

          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Select a bill or service you want to pay.
          </Text>
        </View>

        {/* Bill options */}
        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {billOptions.map((bill, index) => (
            <TouchableOpacity
              key={bill.id}
              activeOpacity={0.75}
              onPress={() => onSelectBill?.(bill.id)}
              style={[
                styles.billRow,
                index !== billOptions.length - 1 && {
                  borderBottomColor: colors.divider,
                  borderBottomWidth: 1,
                },
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.iconBg },
                ]}
              >
                <Text style={styles.billIcon}>{bill.icon}</Text>
              </View>

              {/* Text */}
              <View style={styles.billTextContainer}>
                <Text
                  style={[
                    styles.billTitle,
                    { color: colors.green },
                  ]}
                >
                  {bill.title}
                </Text>

                <Text
                  style={[
                    styles.billDescription,
                    { color: colors.secondary },
                  ]}
                >
                  {bill.description}
                </Text>
              </View>

              {/* Arrow */}
              <View
                style={[
                  styles.arrowContainer,
                  { backgroundColor: colors.arrowBg },
                ]}
              >
                <Text style={[styles.arrow, { color: colors.green }]}>
                  ›
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security notice */}
        <View
          style={[
            styles.securityNotice,
            {
              backgroundColor: colors.noticeBg,
              borderColor: colors.noticeBorder,
            },
          ]}
        >
          <Text style={styles.securityIcon}>🔒</Text>

          <Text
            style={[
              styles.securityText,
              { color: colors.noticeText },
            ]}
          >
            Payments are processed securely through ZENIMONIES.
            Always verify your bill details before confirming a payment.
          </Text>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.muted }]}>
          ZENIMONIES • Secure Bill Payments
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    lineHeight: 32,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
  },
  headerRight: {
    position: 'absolute',
    right: 18,
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 35,
  },
  intro: {
    marginBottom: 20,
  },
  labelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 11,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heading: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
  },
  optionsCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  billRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billIcon: {
    fontSize: 26,
  },
  billTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  billDescription: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  arrowContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: -2,
  },
  securityNotice: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  securityIcon: {
    fontSize: 17,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 10,
  },
});

export default BillsScreen;
