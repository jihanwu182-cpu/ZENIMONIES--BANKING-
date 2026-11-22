
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN = '#07803F';
const DARK = '#172018';
const MUTED = '#858B83';
const BACKGROUND = '#F6F8F3';
const BORDER = '#E9EDE5';
const WHITE = '#FFFFFF';

export interface BankItem {
  code: string;
  name: string;
}

interface VerifiedAccount {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

interface ToBankScreenProps {
  banks?: BankItem[];

  onLoadBanks?: () => Promise<BankItem[]>;

  onVerifyAccount?: (params: {
    accountNumber: string;
    bankCode: string;
  }) => Promise<{
    accountName: string;
  }>;

  onContinue?: (transfer: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    narration: string;
  }) => void;
}

const ToBankScreen = ({
  banks: initialBanks = [],
  onLoadBanks,
  onVerifyAccount,
  onContinue,
}: ToBankScreenProps) => {
  const [banks, setBanks] = useState<BankItem[]>(initialBanks);
  const [selectedBank, setSelectedBank] =
    useState<BankItem | null>(null);

  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [bankModalVisible, setBankModalVisible] =
    useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [verifiedAccount, setVerifiedAccount] =
    useState<VerifiedAccount | null>(null);

  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!onLoadBanks) return;

      try {
        setLoadingBanks(true);
        const result = await onLoadBanks();

        if (mounted) {
          setBanks(result);
        }
      } catch {
        if (mounted) {
          setError('Unable to load banks. Please try again.');
        }
      } finally {
        if (mounted) {
          setLoadingBanks(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [onLoadBanks]);

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleSelectBank = (bank: BankItem) => {
    setSelectedBank(bank);
    setBankModalVisible(false);
    setBankSearch('');
    setAccountName('');
    setVerifiedAccount(null);
    setError('');
  };

  const handleAccountNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);

    setAccountNumber(cleaned);
    setAccountName('');
    setVerifiedAccount(null);
    setError('');
  };

  const handleVerifyAccount = async () => {
    if (!selectedBank) {
      setError('Please select a bank.');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Enter a valid 10-digit account number.');
      return;
    }

    if (!onVerifyAccount) {
      setError('Account verification is not connected yet.');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      setAccountName('');

      const result = await onVerifyAccount({
        accountNumber,
        bankCode: selectedBank.code,
      });

      if (!result?.accountName) {
        setError('Unable to verify this account. Please try again.');
        return;
      }

      setAccountName(result.accountName);

      setVerifiedAccount({
        accountName: result.accountName,
        accountNumber,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
      });
    } catch {
      setError(
        'Account verification failed. Check the details and try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const numericAmount = Number(amount.replace(/,/g, ''));

  const canContinue =
    !!verifiedAccount &&
    numericAmount > 0 &&
    Number.isFinite(numericAmount);

  const handleContinue = () => {
    if (!verifiedAccount || !selectedBank) {
      setError('Please verify the recipient account first.');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }

    onContinue?.({
      bankCode: selectedBank.code,
      bankName: selectedBank.name,
      accountNumber,
      accountName,
      amount: numericAmount,
      narration: narration.trim(),
    });
  };

  const formatAmountInput = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');

    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    return cleaned;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Transfer to Bank</Text>
            <Text style={styles.headerSubtitle}>
              Send money to any Nigerian bank account
            </Text>
          </View>

          {/* Transfer Card */}
          <View style={styles.card}>
            {/* Bank Selector */}
            <Text style={styles.label}>Bank</Text>

            <TouchableOpacity
              style={styles.selectField}
              activeOpacity={0.7}
              onPress={() => setBankModalVisible(true)}
            >
              <Text
                style={[
                  styles.selectText,
                  !selectedBank && styles.placeholder,
                ]}
              >
                {selectedBank?.name || 'Select destination bank'}
              </Text>

              <Text style={styles.chevron}>⌄</Text>
            </TouchableOpacity>

            {/* Account Number */}
            <Text style={styles.label}>Account Number</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit account number"
              placeholderTextColor="#A0A69D"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={handleAccountNumberChange}
              maxLength={10}
            />

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (verifying ||
                  !selectedBank ||
                  accountNumber.length !== 10) &&
                  styles.disabledButton,
              ]}
              disabled={
                verifying ||
                !selectedBank ||
                accountNumber.length !== 10
              }
              onPress={handleVerifyAccount}
              activeOpacity={0.8}
            >
              {verifying ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.verifyButtonText}>
                  Verify Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Verified Recipient */}
            {verifiedAccount && (
              <View style={styles.verifiedBox}>
                <View style={styles.verifiedIcon}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.verifiedLabel}>
                    Account verified
                  </Text>
                  <Text style={styles.accountName}>
                    {verifiedAccount.accountName}
                  </Text>
                  <Text style={styles.accountDetails}>
                    {verifiedAccount.accountNumber} ·{' '}
                    {verifiedAccount.bankName}
                  </Text>
                </View>
              </View>
            )}

            {/* Amount */}
            <Text style={styles.label}>Amount</Text>

            <View style={styles.amountField}>
              <Text style={styles.currency}>₦</Text>

              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#A0A69D"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(value) =>
                  setAmount(formatAmountInput(value))
                }
              />
            </View>

            {/* Narration */}
            <Text style={styles.label}>
              Narration <Text style={styles.optional}>(Optional)</Text>
            </Text>

            <TextInput
              style={[styles.input, styles.narrationInput]}
              placeholder="What is this transfer for?"
              placeholderTextColor="#A0A69D"
              value={narration}
              onChangeText={setNarration}
              maxLength={100}
            />

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue && styles.disabledButton,
            ]}
            disabled={!canContinue}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Continue
            </Text>
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your transfer is protected by ZENIMONIES security.
            </Text>
          </View>
        </ScrollView>

        {/* Bank Selection Modal */}
        <Modal
          visible={bankModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setBankModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Bank</Text>

                <TouchableOpacity
                  onPress={() => setBankModalVisible(false)}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search bank..."
                placeholderTextColor="#A0A69D"
                value={bankSearch}
                onChangeText={setBankSearch}
              />

              {loadingBanks ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={GREEN} size="large" />
                  <Text style={styles.loadingText}>
                    Loading banks...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredBanks}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      No banks found.
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.bankItem}
                      onPress={() => handleSelectBank(item)}
                    >
                      <View style={styles.bankIcon}>
                        <Text style={styles.bankIconText}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <Text style={styles.bankName}>{item.name}</Text>

                      {selectedBank?.code === item.code && (
                        <Text style={styles.selectedCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },

  header: {
    marginBottom: 24,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DARK,
  },

  headerSubtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 6,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 9,
    marginTop: 18,
  },

  selectField: {
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectText: {
    fontSize: 15,
    color: DARK,
  },

  placeholder: {
    color: '#A0A69D',
  },

  chevron: {
    fontSize: 20,
    color: MUTED,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: DARK,
    backgroundColor: WHITE,
  },

  verifyButton: {
    backgroundColor: GREEN,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  verifyButtonText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.45,
  },

  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF8F1',
    borderWidth: 1,
    borderColor: '#D4E9D9',
    borderRadius: 12,
    padding: 13,
    marginTop: 15,
  },

  verifiedIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  checkmark: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '800',
  },

  verifiedLabel: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },

  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK,
    marginTop: 3,
  },

  accountDetails: {
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },

  amountField: {
    height: 60,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  currency: {
    fontSize: 23,
    fontWeight: '700',
    color: GREEN,
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: DARK,
    height: '100%',
  },

  optional: {
    color: MUTED,
    fontWeight: '400',
  },

  narrationInput: {
    height: 50,
  },

  errorBox: {
    backgroundColor: '#FFF1F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
  },

  errorText: {
    color: '#B42318',
    fontSize: 13,
  },

  continueButton: {
    backgroundColor: GREEN,
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  continueButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
  },

  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },

  securityIcon: {
    marginRight: 6,
  },

  securityText: {
    fontSize: 12,
    color: MUTED,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: WHITE,
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
  },

  closeButton: {
    fontSize: 22,
    color: MUTED,
    padding: 5,
  },

  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: DARK,
    marginBottom: 12,
  },

  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  bankIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  bankIconText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '800',
  },

  bankName: {
    flex: 1,
    fontSize: 14,
    color: DARK,
    fontWeight: '600',
  },

  selectedCheck: {
    fontSize: 18,
    fontWeight: '800',
    color: GREEN,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: MUTED,
    fontSize: 14,
  },

  emptyText: {
    textAlign: 'center',
    color: MUTED,
    paddingVertical: 30,
  },
});

export default ToBankScreen;
