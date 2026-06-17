/**
 * Notifications Screen
 */

import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import {
  Bell, CheckCheck, ShieldCheck, Package,
  MessageSquare, Star, Trash2, Crown, ChevronLeft, MessageCircle,
} from "lucide-react-native";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs, getDoc,
  onSnapshot, doc, updateDoc, deleteDoc, writeBatch,
} from "@react-native-firebase/firestore";
import { AppAlert } from "@/components/ui/AppAlert";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  postId?: string;
  read: boolean;
  createdAt: any;
}

type FilterKey = "all" | "deals" | "social" | "system";

const isDeals  = (type: string) => ["listing_approved","listing_rejected","item_reserved","item_sold","new_review"].includes(type);
const isSocial = (type: string) => ["new_message","new_reply","new_post"].includes(type);
const isSystem = (type: string) => ["user_approved","admin_promoted"].includes(type);

const ICON_MAP: Record<string, { icon: any; color: string }> = {
  user_approved:    { icon: ShieldCheck,   color: "#0071E3" },
  listing_approved: { icon: Package,       color: "#34C759" },
  listing_rejected: { icon: Package,       color: "#EF4444" },
  new_message:      { icon: MessageSquare, color: "#F77CA2" },
  new_post:         { icon: Bell,          color: "#0071E3" },
  new_reply:        { icon: MessageCircle, color: "#14B8A6" },
  item_reserved:    { icon: Package,       color: "#F59E0B" },
  item_sold:        { icon: Package,       color: "#0071E3" },
  new_review:       { icon: Star,          color: "#EAB308" },
  admin_promoted:   { icon: Crown,         color: "#F77CA2" },
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = [];
        snapshot.forEach((d) => notifs.push({ id: d.id, ...d.data() } as Notification));
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error("Notifications listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all")    return true;
    if (activeFilter === "deals")  return isDeals(n.type);
    if (activeFilter === "social") return isSocial(n.type);
    if (activeFilter === "system") return isSystem(n.type);
    return true;
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const unreadCounts = {
    all:    notifications.filter((n) => !n.read).length,
    deals:  notifications.filter((n) => !n.read && isDeals(n.type)).length,
    social: notifications.filter((n) => !n.read && isSocial(n.type)).length,
    system: notifications.filter((n) => !n.read && isSystem(n.type)).length,
  };

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(getFirestore(), "notifications", notifId), { read: true });
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    const unread = filteredNotifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const db = getFirestore();
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch {
      AppAlert.alert("Error", "Failed to update notifications.");
    }
  };

  const deleteNotification = async (notifId: string) => {
    try {
      await deleteDoc(doc(getFirestore(), "notifications", notifId));
    } catch {
      AppAlert.alert("Error", "Failed to delete notification.");
    }
  };

  const handleClick = async (notif: Notification) => {
    console.log("notif data:", JSON.stringify(notif));
    if (!notif.read) markAsRead(notif.id);
      if (notif.link) {
        if (notif.link.startsWith("/chat/")) {
          router.push(`/chat/${notif.link.replace("/chat/", "")}` as any);
        } else if (notif.link.startsWith("/product/")) {
          router.push(`/product/${notif.link.replace("/product/", "")}` as any);
        } else if (notif.link.startsWith("/profile/")) {
          router.push(`/profile/${notif.link.replace("/profile/", "")}` as any);
        } else if (notif.link.startsWith("/post/")) {
          router.push(notif.link as any);
        }
        return;
      }

      // fallback for any legacy docs saved without a link
      if (notif.type === "new_post" && notif.postId) {
        router.push(`/post/${notif.postId}` as any);
      }
    };

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "all",    label: "All",    count: unreadCounts.all },
    { key: "deals",  label: "Deals",  count: unreadCounts.deals },
    { key: "social", label: "Social", count: unreadCounts.social },
    { key: "system", label: "System", count: unreadCounts.system },
  ];

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconInfo = ICON_MAP[item.type] || { icon: Bell, color: "#8E8E93" };
    const IconComponent = iconInfo.icon;

    return (
      <TouchableOpacity
        onPress={() => handleClick(item)}
        className={`flex-row items-start gap-3 px-5 py-4 border-b border-content-secondary/10 ${
          !item.read ? "bg-brand-teal/[0.02]" : ""
        }`}
        activeOpacity={0.7}
      >
        <View
          className={`w-10 h-10 rounded-xl items-center justify-center ${
            !item.read ? "bg-brand-teal/10" : "bg-surface-soft dark:bg-surface-dark-elevated"
          }`}
        >
          <IconComponent size={20} color={iconInfo.color} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text variant="label" className="font-bold flex-1" numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && (
              <View className="w-2 h-2 bg-brand-pink rounded-full" />
            )}
          </View>
          <Text
            variant="caption"
            className="text-content-secondary leading-relaxed"
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text
            variant="caption"
            className="text-content-tertiary text-[10px] uppercase tracking-widest font-bold mt-1"
          >
            {item.createdAt?.toDate?.()
              ? item.createdAt.toDate().toLocaleDateString(undefined, {
                  month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : "Just now"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => deleteNotification(item.id)}
          className="p-2 rounded-lg"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={16} color="#C7C7CC" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-brand-teal/5 bg-surface/90 dark:bg-surface-dark/90 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <ChevronLeft size={24} color={isDark ? "#F5F5F7" : "#1D1D1F"} />
          </TouchableOpacity>
          <View>
            <Text variant="h2" className="text-2xl font-sans-semibold dark:text-ink-dark">
              Notifications
            </Text>
            <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint text-[10px] uppercase tracking-widest font-bold">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            className="flex-row items-center gap-1 px-3 py-2 bg-brand-teal/10 rounded-full"
          >
            <CheckCheck size={14} color="#0071E3" />
            <Text variant="caption" className="text-brand-teal text-[10px] font-bold uppercase tracking-widest">
              Read all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-5 py-3 gap-2 border-b border-content-secondary/5">
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveFilter(tab.key)}
            className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full ${
              activeFilter === tab.key
                ? "bg-content dark:bg-ink-dark"
                : "bg-surface-soft dark:bg-surface-dark-elevated"
            }`}
          >
            <Text
              variant="caption"
              className={`text-[10px] font-bold uppercase tracking-widest ${
                activeFilter === tab.key
                  ? "text-white dark:text-surface-dark"
                  : "text-content-tertiary dark:text-ink-dark-faint"
              }`}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                className={`px-1.5 py-0.5 rounded-full min-w-[16px] items-center ${
                  activeFilter === tab.key ? "bg-brand-pink" : "bg-brand-pink/10"
                }`}
              >
                <Text
                  variant="caption"
                  className={`text-[9px] font-bold ${
                    activeFilter === tab.key ? "text-white" : "text-brand-pink"
                  }`}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#14B8A6" />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-brand-teal/5 rounded-2xl items-center justify-center mb-4">
            <Bell size={32} color="#14B8A6" />
          </View>
          <Text variant="h3" className="mb-2 dark:text-ink-dark">All Clear</Text>
          <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted text-center">
            You'll be notified when something important happens — approvals, messages, and more.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}