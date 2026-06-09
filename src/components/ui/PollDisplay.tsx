/**
 * PollDisplay (React Native)
 * Mirrors the web PollDisplay.tsx behaviour:
 *  - Vote / un-vote / change vote
 *  - Animated result bars
 *  - Voter breakdown accordion
 *  - Expiry countdown
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  useColorScheme,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BarChart3, Clock, Users, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─── Types ─────────────────────────────────────────────────── */

interface PollData {
  choices: string[];
  expiresAt: any; // Firestore Timestamp | Date
  votes: Record<string, number>; // { uid: choiceIndex }
}

interface PollDisplayProps {
  postId: string;
  poll: PollData;
  compact?: boolean;
}

/* ─── Animated bar ───────────────────────────────────────────── */

function ResultBar({ pct, isOwn }: { pct: number; isOwn: boolean }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        animStyle,
        { borderRadius: 12, backgroundColor: isOwn ? 'rgba(20,184,166,0.15)' : 'rgba(0,0,0,0.05)' },
      ]}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function PollDisplay({ postId, poll, compact = false }: PollDisplayProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [localVotes, setLocalVotes] = useState<Record<string, number>>(poll.votes ?? {});
  const [voting, setVoting] = useState(false);
  const [showVoters, setShowVoters] = useState(false);
  const [voterProfiles, setVoterProfiles] = useState<
    Record<string, { name: string; profilePicture?: string }>
  >({});
  const [loadingVoters, setLoadingVoters] = useState(false);

  // Keep in sync when parent refreshes poll prop
  useEffect(() => {
    setLocalVotes(poll.votes ?? {});
  }, [poll.votes]);

  /* ─── Derived values ─────────────────────────────────────── */

  const userVote = user?.uid !== undefined ? localVotes[user.uid] : undefined;
  const hasVoted = userVote !== undefined;
  const totalVotes = Object.keys(localVotes).length;

  const expiresAt: Date = poll.expiresAt?.toDate
    ? poll.expiresAt.toDate()
    : poll.expiresAt instanceof Date
    ? poll.expiresAt
    : new Date(poll.expiresAt);
  const isExpired = expiresAt < new Date();

  const getTimeRemaining = () => {
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Poll ended';
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const getVoteCount = (i: number) =>
    Object.values(localVotes).filter(v => v === i).length;

  const getPercentage = (i: number) =>
    totalVotes === 0 ? 0 : Math.round((getVoteCount(i) / totalVotes) * 100);

  const showResults = hasVoted || isExpired;

  /* ─── Vote handler ───────────────────────────────────────── */

  const handleVote = async (choiceIndex: number) => {
    if (!user || isExpired || voting) return;
    setVoting(true);
    const prev = { ...localVotes };
    let next: Record<string, number>;
    if (userVote === choiceIndex) {
      next = { ...localVotes };
      delete next[user.uid];
    } else {
      next = { ...localVotes, [user.uid]: choiceIndex };
    }
    setLocalVotes(next);
    try {
      await firestore().collection('posts').doc(postId).update({ 'poll.votes': next });
    } catch {
      setLocalVotes(prev);
    } finally {
      setVoting(false);
    }
  };

  /* ─── Voter profile fetching ─────────────────────────────── */

  const fetchVoters = useCallback(async () => {
    const uids = Object.keys(localVotes);
    const missing = uids.filter(uid => !voterProfiles[uid]);
    if (missing.length === 0) return;
    setLoadingVoters(true);
    const profiles = { ...voterProfiles };
    await Promise.all(
      missing.map(async uid => {
        try {
          const snap = await firestore().collection('users').doc(uid).get();
          if (snap.exists()) {
            const d = snap.data()!;
            profiles[uid] = { name: d.name ?? 'Anonymous', profilePicture: d.profilePicture };
          } else {
            profiles[uid] = { name: 'Unknown User' };
          }
        } catch {
          profiles[uid] = { name: 'Unknown User' };
        }
      }),
    );
    setVoterProfiles(profiles);
    setLoadingVoters(false);
  }, [localVotes, voterProfiles]);

  useEffect(() => {
    if (!showVoters) return;
    fetchVoters();
  }, [showVoters]);

  const toggleVoters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowVoters(v => !v);
  };

  /* ─── Colors ─────────────────────────────────────────────── */

  const teal = '#14B8A6';
  const ink = isDark ? '#E4E4E7' : '#1A1A2E';
  const muted = isDark ? 'rgba(228,228,231,0.4)' : 'rgba(26,26,46,0.4)';
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const cardBg = isDark ? 'rgba(28,28,30,0.8)' : 'rgba(248,248,250,0.8)';

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      {/* Choice buttons */}
      {poll.choices.map((choice, i) => {
        const isOwn = userVote === i;
        const pct = getPercentage(i);

        return (
          <TouchableOpacity
            key={i}
            activeOpacity={isExpired ? 1 : 0.75}
            onPress={() => handleVote(i)}
            disabled={isExpired || voting}
            style={[
              styles.choiceBtn,
              {
                borderColor: isOwn ? teal : border,
                backgroundColor: isOwn
                  ? isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.04)'
                  : 'transparent',
                paddingVertical: compact ? 8 : 11,
                paddingHorizontal: compact ? 12 : 16,
                marginBottom: compact ? 6 : 8,
              },
            ]}
          >
            {/* Animated result bar */}
            {showResults && <ResultBar pct={pct} isOwn={isOwn} />}

            <View style={styles.choiceInner}>
              <View style={styles.choiceLeft}>
                {showResults && isOwn && (
                  <View style={[styles.checkCircle, { backgroundColor: teal }]}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <Text
                  style={[
                    styles.choiceText,
                    { color: isOwn ? teal : ink, fontSize: compact ? 13 : 14 },
                  ]}
                  numberOfLines={2}
                >
                  {choice}
                </Text>
              </View>
              {showResults && (
                <Text style={[styles.pctText, { color: isOwn ? teal : muted }]}>
                  {pct}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Footer row */}
      <View style={[styles.footer, { marginTop: compact ? 6 : 10 }]}>
        <View style={styles.footerLeft}>
          <View style={styles.metaItem}>
            <BarChart3 size={11} color={muted} strokeWidth={2} />
            <Text style={[styles.metaText, { color: muted }]}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={11} color={muted} strokeWidth={2} />
            <Text style={[styles.metaText, { color: muted }]}>{getTimeRemaining()}</Text>
          </View>
          {hasVoted && !isExpired && (
            <Text style={[styles.hintText, { color: muted }]}>Tap to change</Text>
          )}
        </View>

        {showResults && totalVotes > 0 && (
          <TouchableOpacity onPress={toggleVoters} style={styles.votersBtn}>
            <Users size={11} color={teal} strokeWidth={2} />
            <Text style={[styles.votersBtnText, { color: teal }]}>
              {showVoters ? 'Hide' : 'See voters'}
            </Text>
            {showVoters
              ? <ChevronUp size={11} color={teal} />
              : <ChevronDown size={11} color={teal} />}
          </TouchableOpacity>
        )}
      </View>

      {/* Voters breakdown */}
      {showVoters && (
        <View style={[styles.votersCard, { backgroundColor: cardBg, borderColor: border }]}>
          {loadingVoters && Object.keys(voterProfiles).length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={teal} />
              <Text style={[styles.metaText, { color: muted, marginLeft: 8 }]}>
                Loading voters...
              </Text>
            </View>
          ) : (
            poll.choices.map((choice, i) => {
              const votersForOption = Object.entries(localVotes)
                .filter(([, v]) => v === i)
                .map(([uid]) => ({ uid, ...voterProfiles[uid] }));

              return (
                <View key={i} style={i < poll.choices.length - 1 ? styles.optionSection : undefined}>
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionLabel, { color: muted }]}>
                      Option {i + 1}: {choice}
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[styles.countText, { color: muted }]}>
                        {votersForOption.length}
                      </Text>
                    </View>
                  </View>

                  {votersForOption.length > 0 ? (
                    <View style={styles.avatarRow}>
                      {votersForOption.map(voter => (
                        <View key={voter.uid} style={styles.avatarWrap}>
                          {voter.profilePicture ? (
                            <Image
                              source={{ uri: voter.profilePicture }}
                              style={[styles.avatar, { borderColor: cardBg }]}
                            />
                          ) : (
                            <View
                              style={[
                                styles.avatar,
                                styles.avatarPlaceholder,
                                { borderColor: cardBg, backgroundColor: 'rgba(20,184,166,0.12)' },
                              ]}
                            >
                              <Text style={[styles.avatarInitial, { color: teal }]}>
                                {voter.name?.[0]?.toUpperCase() ?? '?'}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.noVotesText, { color: muted }]}>
                      No votes yet
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrap: { marginTop: 14, marginBottom: 20 },
  wrapCompact: { marginTop: 10, marginBottom: 4 },

  choiceBtn: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  choiceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  choiceLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  choiceText: { fontWeight: '600', flex: 1 },
  pctText: { fontSize: 13, fontWeight: '700', flexShrink: 0 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600' },
  hintText: { fontSize: 11, fontStyle: 'italic' },
  votersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  votersBtnText: { fontSize: 12, fontWeight: '600' },

  votersCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },

  optionSection: { paddingBottom: 12, marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  optionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countText: { fontSize: 11, fontWeight: '600' },

  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
  avatarWrap: {},
  avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 11, fontWeight: '700' },
  noVotesText: { fontSize: 12, fontStyle: 'italic', paddingLeft: 2 },
});