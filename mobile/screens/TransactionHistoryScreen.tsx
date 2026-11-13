
import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import colors from '../theme/colors';

type Transaction = {
  id: string;
  title: string;
  description?: string;
  amount: string;
  type: 'credit' | 'debit';
  date: string;
  status?: string;
};

type FilterType = 'All' | 'Money In' | 'Money Out';

type Props = {
  transactions: Transaction[];
  onBack: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export default function TransactionHistoryScreen({
  transactions,
  onBack,
  onRefresh,
  refreshing = false,
}: Props) {
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Money In' &&
          transaction.type === 'credit') ||
        (filter === 'Money Out' &&
          transaction.type === 'debit');

      const searchableText = [
        transaction.title,
        transaction.description,
        transaction.amount,
        transaction.status,
        transaction.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesFilter &&
        (!query || searchableText.includes(query))
      );
    });
  }, [transactions, filter, search]);

  const moneyInCount = transactions.filter(
    (item) => item.type === 'credit'
  ).length;

  const moneyOutCount = transactions.filter(
    (item) => item.type === 'debit'
  ).length;

  const getStatusColor = (status?: string) => {
    const value = (status || '').toLowerCase();

    if (
      value.includes('success') ||
      value.includes('completed')
    ) {
      return '#16864B';
    }

    if (
      value.includes('pending') ||
      value.includes('processing')
    ) {
      return '#D18A18';
    }

    if (
      value.includes('failed') ||
      value.includes('reversed')
    ) {
      return '#D64545';
    }

    return colors.textSecondary;
  };

  const renderTransaction = (item: Transaction) => {
    const isCredit = item.type === 'credit';

    return (
      <View key={item.id} style={styles.transactionRow}>
        <View
          style={[
            styles.transactionIcon,
            isCredit
              ? styles.creditIcon
              : styles.debitIcon,
          ]}
        >
          <Text
            style={[
              styles.transactionIconText,
              isCredit
                ? styles.creditText
                : styles.debitText,
            ]}
          >
            {isCredit ? '↓' : '↑'}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          <Text
            style={styles.transactionTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {!!item.description && (
            <Text
              style={styles.transactionDescription}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}

          <Text style={styles.transactionDate}>
            {item.date}
          </Text>

          <Text
            style={[
              styles.transactionStatus,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status || 'Status unavailable'}
          </Text>
        </View>

        <Text
          style={[
            styles.transactionAmount,
            isCredit ? styles.creditText : styles.debitText,
          ]}
        >
          {isCredit ? '+' : '-'}
          {item.amount}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Transaction History
          </Text>
          <Text style={styles.headerSubtitle}>
            Your account activity
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Transaction overview
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Money In
              </Text>
              <Text style={styles.moneyInValue}>
                {moneyInCount}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Money Out
              </Text>
              <Text style={styles.moneyOutValue}>
                {moneyOutCount}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>
                Total
              </Text>
              <Text style={styles.totalValue}>
                {transactions.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
            >
              <Text style={styles.clearSearch}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          {(['All', 'Money In', 'Money Out'] as FilterType[]).map(
            (item) => {
              const selected = filter === item;

              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterButton,
                    selected && styles.activeFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.activeFilterText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Recent activity
          </Text>

          <Text style={styles.listCount}>
            {filteredTransactions.length} found
          </Text>
        </View>

        {filteredTransactions.length > 0 ? (
          <View style={styles.transactionList}>
            {filteredTransactions.map(renderTransaction)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>◷</Text>
            </View>

            <Text style={styles.emptyTitle}>
              {search
                ? 'No matching transactions'
                : filter === 'Money In'
                  ? 'No money received yet'
                  : filter === 'Money Out'
                    ? 'No outgoing transactions yet'
                    : 'No transactions yet'}
            </Text>

            <Text style={styles.emptyDescription}>
              {search
                ? 'Try another search term.'
                : 'Your account activities will appear here when available.'}
            </Text>

            {search.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearch('')}
              >
                <Text style={styles.clearButtonText}>
                  Clear search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {refreshing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>
              Refreshing transactions...
            </Text>
          </View>
        )}

        <Text style={styles.footerNote}>
          Showing transactions supplied by your ZENIMONIES account.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  backArrow: {
    fontSize: 36,
    lineHeight: 40,
    color: colors.text,
    marginTop: -4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 35,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 7,
  },
  moneyInValue: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.success,
  },
  moneyOutValue: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.error,
  },
  totalValue: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: colors.border,
  },
  searchBox: {
    minHeight: 52,
    backgroundColor: colors.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 25,
    color: colors.textSecondary,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 12,
  },
  clearSearch: {
    fontSize: 24,
    color: colors.textSecondary,
    paddingHorizontal: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 9,
  },
  activeFilter: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeFilterText: {
    color: colors.white,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  listCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionList: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creditIcon: {
    backgroundColor: '#E8F5ED',
  },
  debitIcon: {
    backgroundColor: '#FCECEC',
  },
  transactionIconText: {
    fontSize: 23,
    fontWeight: '800',
  },
  creditText: {
    color: colors.success,
  },
  debitText: {
    color: colors.error,
  },
  transactionDetails: {
    flex: 1,
    paddingRight: 8,
  },
  transactionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  transactionDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  transactionDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 5,
  },
  transactionStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyIconText: {
    fontSize: 30,
    color: colors.primary,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  clearButton: {
    marginTop: 16,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerNote: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 16,
  },
});
