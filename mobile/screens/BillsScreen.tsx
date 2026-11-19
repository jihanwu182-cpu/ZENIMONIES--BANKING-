
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import colors from '../theme/colors';

type BillsScreenProps = {
  onBack: () => void;
  onElectricityPress: () => void;
};

const BRAND_GREEN = '#00843D';
const LIGHT_GREEN = '#E8F3D9';
const DARK_TEXT = '#172018';
const MUTED_TEXT = '#858B83';
const BORDER = '#E9EDE5';
const WHITE = '#FFFFFF';

export default function BillsScreen({
  onBack,
  onElectricityPress,
}: BillsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Bills</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* PAYMENTS BADGE */}
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>PAYMENTS</Text>
        </View>

        {/* PAGE TITLE */}
        <Text style={styles.title}>Pay Your Bills</Text>

        <Text style={styles.subtitle}>
          Select a bill or service you want to pay.
        </Text>

        {/* BILL CATEGORIES */}
        <View style={styles.categoryContainer}>
          {/* ELECTRICITY */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={onElectricityPress}
            activeOpacity={0.75}
          >
            <View style={styles.iconBox}>
              <Text style={styles.electricityIcon}>⚡</Text>
            </View>

            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>Electricity</Text>
              <Text style={styles.categoryDescription}>
                Pay prepaid and postpaid electricity bills
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* INTERNET */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => {}}
            activeOpacity={0.75}
          >
            <View style={styles.iconBox}>
              <Text style={styles.internetIcon}>🌐</Text>
            </View>

            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>Internet</Text>
              <Text style={styles.categoryDescription}>
                Pay internet and broadband bills
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* OTHER BILLS */}
          <TouchableOpacity
            style={[styles.categoryCard, styles.lastCategoryCard]}
            onPress={() => {}}
            activeOpacity={0.75}
          >
            <View style={styles.iconBox}>
              <Text style={styles.otherBillsIcon}>🧾</Text>
            </View>

            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>Other Bills</Text>
              <Text style={styles.categoryDescription}>
                Pay other supported bills and services
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* SECURITY NOTICE */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>🔒</Text>

          <Text style={styles.securityText}>
            Payments are processed securely through ZENIMONIES. Always verify
            your bill details before confirming a payment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* HEADER */
  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: colors.background,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 35,
    color: DARK_TEXT,
    fontWeight: '400',
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK_TEXT,
  },

  headerSpacer: {
    width: 42,
  },

  /* CONTENT */
  content: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 30,
  },

  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },

  sectionBadgeText: {
    color: BRAND_GREEN,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  title: {
    fontSize: 31,
    fontWeight: '900',
    color: DARK_TEXT,
    letterSpacing: -0.7,
  },

  subtitle: {
    fontSize: 15,
    color: MUTED_TEXT,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 32,
  },

  /* CATEGORY CARD GROUP */
  categoryContainer: {
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  categoryCard: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  lastCategoryCard: {
    borderBottomWidth: 0,
  },

  /* SMALLER ICONS */
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },

  electricityIcon: {
    fontSize: 25,
  },

  internetIcon: {
    fontSize: 23,
  },

  otherBillsIcon: {
    fontSize: 23,
  },

  /* TEXT */
  categoryContent: {
    flex: 1,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: BRAND_GREEN,
    marginBottom: 7,
  },

  categoryDescription: {
    fontSize: 14,
    color: MUTED_TEXT,
    lineHeight: 22,
    maxWidth: 225,
  },

  chevron: {
    fontSize: 28,
    fontWeight: '500',
    color: BRAND_GREEN,
    marginLeft: 8,
  },

  /* SECURITY NOTICE */
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 34,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  securityIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },

  securityText: {
    flex: 1,
    fontSize: 13,
    color: MUTED_TEXT,
    lineHeight: 23,
  },
});
