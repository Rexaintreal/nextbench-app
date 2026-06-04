/**
 * Report Modal Component
 *
 * A bottom-sheet style modal for reporting content.
 * Shows a list of report reasons and an optional notes field.
 */

import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { X, Flag, Check } from "lucide-react-native";
import {
  REPORT_REASONS,
  reportContent,
  type ReportContentType,
  type ReportReason,
} from "@/lib/reports";
import { useAuth } from "@/providers/AuthProvider";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId: string;
}

export default function ReportModal({
  visible,
  onClose,
  contentType,
  contentId,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;

    setSubmitting(true);
    try {
      await reportContent(
        user.uid,
        contentType,
        contentId,
        selectedReason,
        notes
      );
      Alert.alert(
        "Report Submitted",
        "Thank you for helping keep our community safe. We'll review this report."
      );
      onClose();
      // Reset
      setSelectedReason(null);
      setNotes("");
    } catch (err) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end"
      >
        <Pressable
          onPress={() => {}}
          className="bg-surface rounded-t-3xl max-h-[80%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-content-secondary/10">
            <View className="flex-row items-center gap-2">
              <Flag size={18} color="#EF4444" />
              <Text variant="h3" className="font-bold">
                Report Content
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5 py-4">
            <Text
              variant="caption"
              className="text-content-secondary text-[10px] uppercase tracking-widest font-bold mb-4"
            >
              Select a reason
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => setSelectedReason(reason.id)}
                className={`flex-row items-center justify-between py-3.5 px-4 mb-2 rounded-xl border ${
                  selectedReason === reason.id
                    ? "bg-brand-pink/5 border-brand-pink/30"
                    : "border-content-secondary/10"
                }`}
              >
                <Text
                  variant="body"
                  className={`font-medium ${
                    selectedReason === reason.id
                      ? "text-brand-pink"
                      : "text-content"
                  }`}
                >
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <Check size={18} color="#F77CA2" />
                )}
              </TouchableOpacity>
            ))}

            {/* Notes */}
            <Text
              variant="caption"
              className="text-content-secondary text-[10px] uppercase tracking-widest font-bold mt-4 mb-2"
            >
              Additional notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Provide any additional context..."
              placeholderTextColor="#8E8E93"
              className="bg-surface-soft rounded-xl px-4 py-3 text-content font-medium h-20 border border-content-secondary/10"
              textAlignVertical="top"
              multiline
              maxLength={500}
            />
          </ScrollView>

          {/* Submit */}
          <View className="px-5 pb-8 pt-3">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
              className={`py-4 rounded-xl items-center ${
                selectedReason
                  ? "bg-red-500"
                  : "bg-red-500/40"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text
                  variant="label"
                  className="text-white font-bold uppercase tracking-[0.2em]"
                >
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
