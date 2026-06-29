import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import {
  Heart,
  DollarSign,
  Check,
  X,
  CreditCard,
  TrendingUp,
  Gift,
  Repeat,
  History,
  ShieldCheck,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import Colors from "@/constants/colors";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { trpc, trpcClient } from "@/lib/trpc";
import { GivingType, GivingFrequency, Donation } from "@/types";

type Tab = "give" | "history";

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

const FREQUENCY_OPTIONS: { value: GivingFrequency; label: string; description: string }[] = [
  { value: "one_time", label: "One-time", description: "Single donation" },
  { value: "weekly", label: "Weekly", description: "Every week" },
  { value: "bi_weekly", label: "Bi-weekly", description: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Every month" },
];

export default function GivingTabScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors: tc } = useTheme();
  const { user, currentOrganization, isChurchApproved } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("give");
  const [givingType, setGivingType] = useState<GivingType>("tithe");
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState(false);
  const [frequency, setFrequency] = useState<GivingFrequency>("one_time");
  const [note, setNote] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);
  const [_pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const organizationId = currentOrganization?.id || "";

  const ministriesQuery = useQuery({
    queryKey: ['giving-ministries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('ministries')
        .select('id, name, color')
        .eq('church_id', organizationId)
        .eq('status', 'active')
        .order('name');
      if (error) { console.log('Ministries query error:', error); return []; }
      return (data || []) as { id: string; name: string; color: string | null }[];
    },
    enabled: !!organizationId,
  });

  const statsQuery = useQuery({
    queryKey: ['giving', 'stats', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return { thisMonthTotal: 0, thisYearTotal: 0, donationCount: 0 };
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

      const { data: allDonations, error: allErr } = await (supabase as any)
        .from('donations')
        .select('amount, created_at')
        .eq('church_id', organizationId)
        .eq('user_id', user.id);
      if (allErr) { console.log('Giving stats error:', allErr); return { thisMonthTotal: 0, thisYearTotal: 0, donationCount: 0 }; }

      const donations = (allDonations || []) as { amount: number; created_at: string }[];
      const thisMonthTotal = donations.filter(d => d.created_at >= startOfMonth).reduce((s, d) => s + (d.amount || 0), 0);
      const thisYearTotal = donations.filter(d => d.created_at >= startOfYear).reduce((s, d) => s + (d.amount || 0), 0);
      return { thisMonthTotal, thisYearTotal, donationCount: donations.length };
    },
    enabled: !!user && !!organizationId,
  });

  const historyQuery = useQuery({
    queryKey: ['giving', 'history', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return [] as Donation[];
      const { data, error } = await (supabase as any)
        .from('donations')
        .select('*')
        .eq('church_id', organizationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.log('Donation history error:', error); return [] as Donation[]; }
      return (data || []).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        organizationId: d.church_id,
        type: d.donation_type || 'offering',
        amount: d.amount || 0,
        currency: d.currency || 'USD',
        frequency: d.frequency || 'one_time',
        note: d.note || undefined,
        status: d.status || 'completed',
        paymentMethod: d.payment_method || 'card',
        createdAt: d.created_at,
        updatedAt: d.updated_at || d.created_at,
      })) as Donation[];
    },
    enabled: !!user && !!organizationId && activeTab === "history",
  });

  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation();

  const resetForm = useCallback(() => {
    setAmount("");
    setCustomAmount(false);
    setFrequency("one_time");
    setNote("");
    setGivingType("tithe");
    setSelectedMinistryId(null);
  }, []);

  const handlePaymentComplete = useCallback(async (sessionId: string, numAmount: number, currentGivingType: GivingType, currentFrequency: GivingFrequency, currentNote: string, currentMinistryId: string | null, currentOrgId: string) => {
    setIsVerifying(true);
    try {
      console.log('Giving: Verifying Stripe session:', sessionId);
      const verification = await trpcClient.stripe.verifySession.query({ sessionId });
      console.log('Giving: Verification result, paid:', verification.paid);

      if (verification.paid) {
        const { error } = await (supabase as any)
          .from('donations')
          .insert({
            church_id: currentOrgId,
            user_id: user?.id,
            donation_type: currentGivingType,
            amount: numAmount,
            currency: 'USD',
            frequency: currentFrequency,
            note: currentNote.trim() || null,
            payment_method: 'stripe',
            ministry_id: currentMinistryId || null,
            status: 'completed',
            stripe_session_id: sessionId,
          });
        if (error) {
          console.error('Giving: Supabase insert error:', error);
        }
        void queryClient.invalidateQueries({ queryKey: ['giving'] });
        setPendingSessionId(null);
        setShowSuccessModal(true);
        resetForm();
      } else {
        Alert.alert('Payment Incomplete', 'Your payment was not completed. Please try again.');
      }
    } catch (err) {
      console.error('Giving: Verification error:', err);
      Alert.alert('Verification Error', 'Could not verify payment. Contact support if you were charged.');
    } finally {
      setIsVerifying(false);
    }
  }, [user?.id, queryClient, resetForm]);

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString());
    setCustomAmount(false);
  };

  const handleCustomAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setAmount(cleaned);
    setCustomAmount(true);
  };

  const handleSubmit = () => {
    if (!isChurchApproved) {
      Alert.alert('Not Available', 'Giving is not available until your church registration is approved.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid donation amount.");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmDonation = async () => {
    if (!isChurchApproved || !user?.id) {
      Alert.alert('Not Available', 'Giving is not available until your church registration is approved.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    try {
      console.log('Giving: Creating Stripe checkout session, amount:', numAmount);
      const result = await checkoutMutation.mutateAsync({
        amount: numAmount,
        currency: 'usd',
        donationType: givingType,
        churchId: organizationId,
        userId: user.id,
        ministryId: selectedMinistryId,
        note: note.trim() || undefined,
        frequency,
        churchName: currentOrganization?.name,
      });

      if (!result.url) {
        throw new Error('No checkout URL returned from server');
      }

      setShowConfirmModal(false);
      setPendingSessionId(result.sessionId);

      if (Platform.OS === 'web') {
        try {
          const supported = await Linking.canOpenURL(result.url);
          if (supported) {
            await Linking.openURL(result.url);
          } else {
            window.open(result.url, '_blank');
          }
        } catch (linkErr) {
          console.log('Giving: Linking.openURL failed, trying window.open:', linkErr);
          window.open(result.url, '_blank');
        }

        setTimeout(() => {
          Alert.alert(
            'Payment Complete?',
            'Did you finish your payment in the browser tab?',
            [
              { text: 'No', style: 'cancel', onPress: () => setPendingSessionId(null) },
              {
                text: 'Yes, Verify',
                onPress: () => void handlePaymentComplete(result.sessionId, numAmount, givingType, frequency, note, selectedMinistryId, organizationId),
              },
            ]
          );
        }, 2000);
      } else {
        const redirectUrl = Linking.createURL('payment-success');
        const browserResult = await WebBrowser.openAuthSessionAsync(result.url, redirectUrl);

        if (browserResult.type === 'success' && browserResult.url) {
          try {
            const returnedUrl = new URL(browserResult.url);
            const returnedSessionId = returnedUrl.searchParams.get('session_id') || result.sessionId;
            await handlePaymentComplete(returnedSessionId, numAmount, givingType, frequency, note, selectedMinistryId, organizationId);
          } catch (parseErr) {
            console.log('Giving: URL parse error, using original session ID:', parseErr);
            await handlePaymentComplete(result.sessionId, numAmount, givingType, frequency, note, selectedMinistryId, organizationId);
          }
        } else if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
          Alert.alert(
            'Payment Status',
            'Did you complete the payment before closing?',
            [
              { text: 'No', style: 'cancel', onPress: () => setPendingSessionId(null) },
              { text: 'Yes, Verify', onPress: () => void handlePaymentComplete(result.sessionId, numAmount, givingType, frequency, note, selectedMinistryId, organizationId) },
            ]
          );
        } else {
          setPendingSessionId(null);
        }
      }
    } catch (err: any) {
      console.error('Giving: Checkout error:', err?.message || err);
      const errorMsg = err?.message?.includes('STRIPE_SECRET_KEY')
        ? 'Stripe is not configured yet. Please contact your church administrator.'
        : err?.message?.includes('fetch')
        ? 'Could not reach the payment server. Please check your internet connection.'
        : `Failed to initiate payment: ${err?.message || 'Unknown error'}`;
      Alert.alert('Payment Error', errorMsg);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void queryClient.invalidateQueries({ queryKey: ["giving"] });
  }, [queryClient]);

  const renderGiveTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={statsQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={tc.primary}
        />
      }
    >
      {statsQuery.data && (
        <View style={[styles.statsCard, { backgroundColor: tc.surface }]}>
          <View style={styles.statsHeader}>
            <TrendingUp size={20} color={tc.primary} />
            <Text style={[styles.statsTitle, { color: tc.text }]}>Your Giving Summary</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: tc.text }]}>{formatCurrency(statsQuery.data.thisMonthTotal)}</Text>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>This Month</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: tc.borderLight }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: tc.text }]}>{formatCurrency(statsQuery.data.thisYearTotal)}</Text>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>This Year</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: tc.borderLight }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: tc.text }]}>{statsQuery.data.donationCount}</Text>
              <Text style={[styles.statLabel, { color: tc.textSecondary }]}>Total Gifts</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Giving Type</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              { backgroundColor: tc.surface, borderColor: tc.borderLight },
              givingType === "tithe" && { backgroundColor: tc.primary, borderColor: tc.primary },
            ]}
            onPress={() => setGivingType("tithe")}
          >
            <DollarSign size={24} color={givingType === "tithe" ? "#fff" : tc.primary} />
            <Text style={[styles.typeButtonText, { color: tc.text }, givingType === "tithe" && styles.typeButtonTextActive]}>Tithe</Text>
            <Text style={[styles.typeButtonDescription, { color: tc.textSecondary }, givingType === "tithe" && styles.typeButtonDescriptionActive]}>10% of income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              { backgroundColor: tc.surface, borderColor: tc.borderLight },
              givingType === "offering" && { backgroundColor: tc.primary, borderColor: tc.primary },
            ]}
            onPress={() => setGivingType("offering")}
          >
            <Gift size={24} color={givingType === "offering" ? "#fff" : tc.secondary} />
            <Text style={[styles.typeButtonText, { color: tc.text }, givingType === "offering" && styles.typeButtonTextActive]}>Offering</Text>
            <Text style={[styles.typeButtonDescription, { color: tc.textSecondary }, givingType === "offering" && styles.typeButtonDescriptionActive]}>Additional gift</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Amount</Text>
        <View style={styles.amountGrid}>
          {PRESET_AMOUNTS.map((presetAmount) => (
            <TouchableOpacity
              key={presetAmount}
              style={[
                styles.amountButton,
                { backgroundColor: tc.surface, borderColor: tc.borderLight },
                amount === presetAmount.toString() && !customAmount && { backgroundColor: tc.primary, borderColor: tc.primary },
              ]}
              onPress={() => handleAmountSelect(presetAmount)}
            >
              <Text
                style={[
                  styles.amountButtonText,
                  { color: tc.text },
                  amount === presetAmount.toString() && !customAmount && { color: '#fff' },
                ]}
              >
                ${presetAmount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customAmountContainer}>
          <Text style={[styles.customAmountLabel, { color: tc.textSecondary }]}>Or enter custom amount</Text>
          <View style={[styles.customAmountInput, { backgroundColor: tc.surface, borderColor: tc.borderLight }]}>
            <Text style={[styles.currencySymbol, { color: tc.text }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: tc.text }]}
              placeholder="0.00"
              placeholderTextColor={tc.textTertiary}
              keyboardType="decimal-pad"
              value={customAmount ? amount : ""}
              onChangeText={handleCustomAmount}
              onFocus={() => setCustomAmount(true)}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Frequency</Text>
        <View style={styles.frequencyOptions}>
          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyOption,
                { backgroundColor: tc.surface, borderColor: tc.borderLight },
                frequency === option.value && { backgroundColor: tc.primary, borderColor: tc.primary },
              ]}
              onPress={() => setFrequency(option.value)}
            >
              <View style={styles.frequencyOptionContent}>
                {option.value !== "one_time" && (
                  <Repeat size={16} color={frequency === option.value ? '#fff' : tc.textSecondary} style={styles.frequencyIcon} />
                )}
                <View>
                  <Text style={[styles.frequencyLabel, { color: tc.text }, frequency === option.value && { color: '#fff' }]}>{option.label}</Text>
                  <Text style={[styles.frequencyDescription, { color: tc.textSecondary }, frequency === option.value && { color: '#fff', opacity: 0.9 }]}>{option.description}</Text>
                </View>
              </View>
              {frequency === option.value && <Check size={20} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(ministriesQuery.data || []).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Direct To (Optional)</Text>
          <View style={styles.frequencyOptions}>
            <TouchableOpacity
              style={[
                styles.frequencyOption,
                { backgroundColor: tc.surface, borderColor: tc.borderLight },
                !selectedMinistryId && { backgroundColor: tc.primary, borderColor: tc.primary },
              ]}
              onPress={() => setSelectedMinistryId(null)}
            >
              <View style={styles.frequencyOptionContent}>
                <View>
                  <Text style={[styles.frequencyLabel, { color: tc.text }, !selectedMinistryId && { color: '#fff' }]}>General Fund</Text>
                  <Text style={[styles.frequencyDescription, { color: tc.textSecondary }, !selectedMinistryId && { color: '#fff', opacity: 0.9 }]}>Church general fund</Text>
                </View>
              </View>
              {!selectedMinistryId && <Check size={20} color="#fff" />}
            </TouchableOpacity>
            {(ministriesQuery.data || []).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.frequencyOption,
                  { backgroundColor: tc.surface, borderColor: tc.borderLight },
                  selectedMinistryId === m.id && { backgroundColor: tc.primary, borderColor: tc.primary },
                ]}
                onPress={() => setSelectedMinistryId(m.id)}
              >
                <View style={styles.frequencyOptionContent}>
                  <View style={[styles.ministryDot, { backgroundColor: m.color || tc.primary }]} />
                  <View>
                    <Text style={[styles.frequencyLabel, { color: tc.text }, selectedMinistryId === m.id && { color: '#fff' }]}>{m.name}</Text>
                  </View>
                </View>
                {selectedMinistryId === m.id && <Check size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Note (Optional)</Text>
        <TextInput
          style={[styles.noteInput, { backgroundColor: tc.surface, borderColor: tc.borderLight, color: tc.text }]}
          placeholder="Add a note or memo..."
          placeholderTextColor={tc.textTertiary}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: tc.primary },
          (!amount || parseFloat(amount) <= 0) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!amount || parseFloat(amount) <= 0 || isVerifying}
      >
        <Heart size={20} color="#fff" />
        <Text style={styles.submitButtonText}>
          Give {amount ? formatCurrency(parseFloat(amount)) : "$0.00"}
        </Text>
      </TouchableOpacity>

      <View style={styles.securityNote}>
        <ShieldCheck size={16} color={tc.success} />
        <Text style={[styles.securityText, { color: tc.success }]}>Secured by Stripe · SSL encrypted</Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={historyQuery.isRefetching} onRefresh={onRefresh} tintColor={tc.primary} />
      }
    >
      {historyQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : historyQuery.data && historyQuery.data.length > 0 ? (
        <View style={styles.historyList}>
          {historyQuery.data.map((donation: Donation) => (
            <View key={donation.id} style={[styles.historyItem, { backgroundColor: tc.surface }]}>
              <View style={styles.historyItemLeft}>
                <View style={[styles.historyIcon, { backgroundColor: donation.type === "tithe" ? tc.primaryLight + '20' : tc.secondaryLight + '20' }]}>
                  {donation.type === "tithe" ? <DollarSign size={18} color={tc.primary} /> : <Gift size={18} color={tc.secondary} />}
                </View>
                <View style={styles.historyDetails}>
                  <Text style={[styles.historyType, { color: tc.text }]}>{donation.type === "tithe" ? "Tithe" : "Offering"}</Text>
                  <Text style={[styles.historyDate, { color: tc.textSecondary }]}>{formatDate(donation.createdAt)}</Text>
                  {!!donation.note && <Text style={[styles.historyNote, { color: tc.textTertiary }]} numberOfLines={1}>{donation.note}</Text>}
                </View>
              </View>
              <View style={styles.historyItemRight}>
                <Text style={[styles.historyAmount, { color: tc.text }]}>{formatCurrency(donation.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: donation.status === "completed" ? tc.successLight : donation.status === "failed" ? tc.errorLight : tc.warningLight }]}>
                  <Text style={[styles.statusText, { color: donation.status === "completed" ? tc.success : donation.status === "failed" ? tc.error : tc.warning }]}>{donation.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <History size={48} color={tc.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: tc.text }]}>No Giving History</Text>
          <Text style={[styles.emptyStateText, { color: tc.textSecondary }]}>Your donations will appear here after you make your first gift.</Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: tc.surface, borderBottomColor: tc.borderLight }]}>
        <Text style={[styles.title, { color: tc.text }]}>Giving</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: tc.surface, borderBottomColor: tc.borderLight }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "give" && { borderBottomColor: tc.primary }]}
          onPress={() => setActiveTab("give")}
        >
          <Heart size={18} color={activeTab === "give" ? tc.primary : tc.textSecondary} />
          <Text style={[styles.tabText, { color: tc.textSecondary }, activeTab === "give" && { color: tc.primary }]}>Give</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && { borderBottomColor: tc.primary }]}
          onPress={() => setActiveTab("history")}
        >
          <History size={18} color={activeTab === "history" ? tc.primary : tc.textSecondary} />
          <Text style={[styles.tabText, { color: tc.textSecondary }, activeTab === "history" && { color: tc.primary }]}>History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "give" && renderGiveTab()}
      {activeTab === "history" && renderHistoryTab()}

      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tc.borderLight }]}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>Confirm Donation</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <X size={24} color={tc.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.confirmDetail}>
                <Text style={[styles.confirmLabel, { color: tc.textSecondary }]}>Type</Text>
                <Text style={[styles.confirmValue, { color: tc.text }]}>{givingType === "tithe" ? "Tithe" : "Offering"}</Text>
              </View>
              <View style={styles.confirmDetail}>
                <Text style={[styles.confirmLabel, { color: tc.textSecondary }]}>Amount</Text>
                <Text style={[styles.confirmValueLarge, { color: tc.primary }]}>{amount ? formatCurrency(parseFloat(amount)) : "$0.00"}</Text>
              </View>
              <View style={styles.confirmDetail}>
                <Text style={[styles.confirmLabel, { color: tc.textSecondary }]}>Frequency</Text>
                <Text style={[styles.confirmValue, { color: tc.text }]}>{FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label}</Text>
              </View>
              {!!note && (
                <View style={styles.confirmDetail}>
                  <Text style={[styles.confirmLabel, { color: tc.textSecondary }]}>Note</Text>
                  <Text style={[styles.confirmValue, { color: tc.text }]}>{note}</Text>
                </View>
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: tc.surfaceSecondary }]} onPress={() => setShowConfirmModal(false)}>
                <Text style={[styles.modalCancelText, { color: tc.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: tc.primary }]}
                onPress={() => void confirmDonation()}
                disabled={checkoutMutation.isPending || isVerifying}
              >
                {checkoutMutation.isPending || isVerifying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CreditCard size={18} color="#fff" />
                    <Text style={styles.modalConfirmText}>Pay with Stripe</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.successModalContent, { backgroundColor: tc.surface }]}>
            <View style={[styles.successIcon, { backgroundColor: tc.successLight }]}>
              <Check size={48} color={tc.success} />
            </View>
            <Text style={[styles.successTitle, { color: tc.text }]}>Thank You!</Text>
            <Text style={[styles.successText, { color: tc.textSecondary }]}>Your {givingType === "tithe" ? "tithe" : "offering"} has been processed successfully.</Text>
            {frequency !== "one_time" && (
              <Text style={[styles.successRecurringNote, { color: tc.textSecondary }]}>Your recurring {frequency.replace("_", "-")} donation has been set up.</Text>
            )}
            <TouchableOpacity style={[styles.successButton, { backgroundColor: tc.primary }]} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: "700" as const },
  tabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 14, fontWeight: "600" as const },
  tabContent: { flex: 1 },
  statsCard: {
    margin: 16, padding: 20, borderRadius: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
    }),
  },
  statsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  statsTitle: { fontSize: 15, fontWeight: "600" as const },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700" as const },
  statLabel: { fontSize: 11, marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: "600" as const, marginBottom: 12 },
  typeButtons: { flexDirection: "row", gap: 12 },
  typeButton: { flex: 1, padding: 18, borderRadius: 14, alignItems: "center", borderWidth: 1.5 },
  typeButtonText: { fontSize: 16, fontWeight: "600" as const, marginTop: 8 },
  typeButtonTextActive: { color: "#FFFFFF" },
  typeButtonDescription: { fontSize: 12, marginTop: 4 },
  typeButtonDescriptionActive: { color: "#FFFFFF", opacity: 0.9 },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amountButton: { width: "31%", paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  amountButtonText: { fontSize: 16, fontWeight: "600" as const },
  customAmountContainer: { marginTop: 16 },
  customAmountLabel: { fontSize: 14, marginBottom: 8 },
  customAmountInput: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16 },
  currencySymbol: { fontSize: 20, fontWeight: "600" as const },
  amountInput: { flex: 1, fontSize: 20, fontWeight: "600" as const, paddingVertical: 15, paddingLeft: 8 },
  frequencyOptions: { gap: 10 },
  frequencyOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, borderRadius: 14, borderWidth: 1.5 },
  frequencyOptionContent: { flexDirection: "row", alignItems: "center" },
  frequencyIcon: { marginRight: 10 },
  frequencyLabel: { fontSize: 15, fontWeight: "600" as const },
  frequencyDescription: { fontSize: 12, marginTop: 2 },
  noteInput: { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: "top" as const },
  submitButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginHorizontal: 16, paddingVertical: 17, borderRadius: 16 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 17, fontWeight: "700" as const, color: "#FFFFFF" },
  securityNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingHorizontal: 16 },
  securityText: { fontSize: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  historyList: { padding: 16, gap: 10 },
  historyItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, borderRadius: 14 },
  historyItemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyDetails: { flex: 1 },
  historyType: { fontSize: 15, fontWeight: "600" as const },
  historyDate: { fontSize: 13, marginTop: 2 },
  historyNote: { fontSize: 12, marginTop: 2 },
  historyItemRight: { alignItems: "flex-end" },
  historyAmount: { fontSize: 16, fontWeight: "700" as const },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: "600" as const, textTransform: "capitalize" as const },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyStateTitle: { fontSize: 18, fontWeight: "600" as const, marginTop: 16 },
  emptyStateText: { fontSize: 14, textAlign: "center" as const, marginTop: 8, lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", borderRadius: 20, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  modalBody: { padding: 20, gap: 16 },
  confirmDetail: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confirmLabel: { fontSize: 14 },
  confirmValue: { fontSize: 15, fontWeight: "600" as const },
  confirmValueLarge: { fontSize: 24, fontWeight: "700" as const },
  modalActions: { flexDirection: "row", padding: 20, gap: 12, borderTopWidth: 1 },
  modalCancelButton: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 14 },
  modalCancelText: { fontSize: 15, fontWeight: "600" as const },
  modalConfirmButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  modalConfirmText: { fontSize: 15, fontWeight: "600" as const, color: "#FFFFFF" },
  successModalContent: { width: "100%", borderRadius: 20, padding: 32, alignItems: "center" },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: "700" as const, marginBottom: 8 },
  successText: { fontSize: 15, textAlign: "center" as const, lineHeight: 22 },
  successRecurringNote: { fontSize: 13, textAlign: "center" as const, marginTop: 12, fontWeight: "500" as const },
  successButton: { marginTop: 24, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  successButtonText: { fontSize: 16, fontWeight: "600" as const, color: "#FFFFFF" },
  ministryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
});
