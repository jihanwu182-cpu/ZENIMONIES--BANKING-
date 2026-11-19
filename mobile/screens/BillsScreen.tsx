
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

export default function BillsScreen({
  onBack,
  onElectricityPress,
}: BillsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.75}
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
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>
            PAYMENTS
          </Text>
        </View>

        <Text style={styles.title}>
          Pay Your Bills
        </Text>

        <Text style={styles.subtitle}>
          Select a bill or service you want to pay.
        </Text>

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
              <Text style={styles.categoryTitle}>
                Electricity
              </Text>

              <Text style={styles.categoryDescription}>
                Pay prepaid and postpaid electricity bills
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* INTERNET */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() =>
              // Internet screen will be connected in a later stage.
              undefined
            }
            activeOpacity={0.75}
          >
            <View style={styles.iconBox}>
              <Text style={styles.internetIcon}>🌐</Text>
            </View>

            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>
                Internet
              </Text>

              <Text style={styles.categoryDescription}>
                Pay internet and broadband bills
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* OTHER BILLS */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() =>
              // Other Bills screen will be connected in a later stage.
              undefined
            }
            activeOpacity={0.75}
          >
            <View style={styles.iconBox}>
              <Text style={styles.otherBillsIcon}>🧾</Text>
            </View>

            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>
                Other Bills
              </Text>

              <Text style={styles.categoryDescription}>
                Pay other supported bills and services
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityNotice}>
          <Text style={styles.securityIcon}>🔒</Text>

          <Text style={styles.securityText}>
            Payments are processed securely through
            ZENIMONIES. Always verify your bill details
            before confirming a payment.
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
    color: colors.text,
    fontWeight: '400',
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 30,
  },

  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F3D9',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 18,
  },

  sectionBadgeText: {
    color: '#00843D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  title: {
    fontSize: 31,
    fontWeight: '900',
    color: '#172018',
    letterSpacing: -0.7,
  },

  subtitle: {
    fontSize: 15,
    color: '#858B83',
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 25,
  },

  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9EDE5',
    overflow: 'hidden',
  },

  categoryCard: {
    minHeight: 155,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 23,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDE5',
  },

  iconBox: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#E8F3D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 17,
  },

  electricityIcon: {
    fontSize: 32,
  },

  internetIcon: {
    fontSize: 29,
  },

  otherBillsIcon: {
    fontSize: 29,
  },

  categoryContent: {
    flex: 1,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00843D',
    marginBottom: 8,
  },

  categoryDescription: {
    fontSize: 14,
    color: '#858B83',
    lineHeight: 22,
    maxWidth: 220,
  },

  chevron: {
    fontSize: 30,
    fontWeight: '500',
    color: '#00843D',
    marginLeft: 8,
  },

  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 35,
    paddingHorizontal: 8,
  },

  securityIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },

  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#718078',
    lineHeight: 25,
  },
});
