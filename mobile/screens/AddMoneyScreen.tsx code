
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Adjust this import path if your theme context is stored elsewhere.
import { useTheme } from '../theme/ThemeContext';

interface Props {
  onBack: () => void;
}

export default function AddMoneyScreen({ onBack }: Props) {
  const { colors } = useTheme();

  const handleCopyAccount = () => {
    Alert.alert(
      'Account unavailable',
      'Your assigned bank account details will appear here once your banking integration is connected.'
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: colors.surfaceSecondary },
          ]}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Money
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* INTRO */}
        <View style={styles.intro}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Fund your account
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary },
            ]}
          >
            Add money to your ZENIMONIES account securely through
            a bank transfer.
          </Text>
        </View>

        {/* BANK TRANSFER CARD */}
        <View
          style={[
            styles.transferCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.bankIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Bank Transfer
              </Text>

              <Text
                style={[
                  styles.cardSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Transfer from any bank
              </Text>
            </View>

            <View
              style={[
                styles.transferBadge,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text
                style={[
                  styles.transferBadgeText,
                  { color: colors.primary },
                ]}
              >
                Bank Transfer
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.separator,
              { backgroundColor: colors.border },
            ]}
          />

          <Text
            style={[
              styles.detailLabel,
              { color: colors.textSecondary },
            ]}
          >
            ACCOUNT NAME
          </Text>

          <Text style={[styles.detailValue, { color: colors.text }]}>
            ZENIMONIES
          </Text>

          <Text
            style={[
              styles.detailLabel,
              { color: colors.textSecondary },
            ]}
          >
            BANK NAME
          </Text>

          <Text style={[styles.detailValue, { color: colors.text }]}>
            Bank details coming soon
          </Text>

          <Text
            style={[
              styles.detailLabel,
              { color: colors.textSecondary },
            ]}
          >
            ACCOUNT NUMBER
          </Text>

          <View style={styles.accountNumberRow}>
            <Text
              style={[
                styles.accountNumber,
                { color: colors.text },
              ]}
            >
              Unavailable
            </Text>

            <TouchableOpacity
              style={[
                styles.copyButton,
                { backgroundColor: colors.primaryLight },
              ]}
              onPress={handleCopyAccount}
              activeOpacity={0.7}
            >
              <Ionicons
                name="copy-outline"
                size={17}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.copyText,
                  { color: colors.primary },
                ]}
              >
                Copy
              </Text>
            </TouchableOpacity>
          </View>

          {/* ACCOUNT NOTICE */}
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.backgroundSoft },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primary}
            />

            <Text
              style={[
                styles.noticeText,
                { color: colors.textSecondary },
              ]}
            >
              Your personal transfer account details will appear
              here once your bank account has been provisioned.
            </Text>
          </View>
        </View>

        {/* HOW TO ADD MONEY */}
        <View
          style={[
            styles.instructionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.instructionTitle,
              { color: colors.text },
            ]}
          >
            How to add money
          </Text>

          <View style={styles.instructionRow}>
            <View
              style={[
                styles.stepCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  { color: colors.primary },
                ]}
              >
                1
              </Text>
            </View>

            <Text
              style={[
                styles.instructionText,
                { color: colors.textSecondary },
              ]}
            >
              Open your bank's mobile app or internet banking.
            </Text>
          </View>

          <View style={styles.instructionRow}>
            <View
              style={[
                styles.stepCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  { color: colors.primary },
                ]}
              >
                2
              </Text>
            </View>

            <Text
              style={[
                styles.instructionText,
                { color: colors.textSecondary },
              ]}
            >
              Transfer money to your ZENIMONIES assigned account.
            </Text>
          </View>

          <View style={styles.instructionRow}>
            <View
              style={[
                styles.stepCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  { color: colors.primary },
                ]}
              >
                3
              </Text>
            </View>

            <Text
              style={[
                styles.instructionText,
                { color: colors.textSecondary },
              ]}
            >
              Once payment is confirmed, your balance will be updated.
            </Text>
          </View>
        </View>

        {/* SECURITY NOTICE */}
        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={colors.primary}
          />

          <Text
            style={[
              styles.securityText,
              { color: colors.textSecondary },
            ]}
          >
            Transfers are credited only after payment confirmation.
            Never share your PIN or password with anyone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 35,
  },

  intro: {
    alignItems: 'center',
    marginBottom: 25,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 10,
  },

  transferCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 18,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  cardSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  transferBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  transferBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  separator: {
    height: 1,
    marginVertical: 20,
  },

  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 7,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },

  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  accountNumber: {
    fontSize: 16,
    fontWeight: '700',
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  copyText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },

  instructionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 18,
  },

  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },

  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
  },

  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    paddingTop: 3,
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 5,
  },

  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },
});
