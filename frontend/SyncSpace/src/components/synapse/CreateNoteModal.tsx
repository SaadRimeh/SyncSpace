import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { GradientBadge } from '@/components/ui/GradientBadge';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (noteData: {
    title: string;
    content: string;
    tags: string[];
    is_pinned: boolean;
  }) => Promise<void>;
  initialNote?: {
    id?: string;
    title: string;
    content: string;
    tags?: string[];
    is_pinned: boolean;
  } | null;
  availableTags?: string[];
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialNote,
  availableTags = [],
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title || '');
      setContent(initialNote.content || '');
      setTags(initialNote.tags || []);
      setIsPinned(initialNote.is_pinned || false);
    } else {
      setTitle('');
      setContent('');
      setTagInput('');
      setTags([]);
      setIsPinned(false);
    }
  }, [initialNote, visible]);

  const addTag = (rawTag: string) => {
    const cleaned = rawTag.replace(/^#/, '').trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        tags,
        is_pinned: isPinned,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialNote?.id ? 'Edit Synapse Note' : 'Capture New Note'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Note Title */}
            <Text style={styles.label}>NOTE TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Redis Cluster Architecture Decisions"
              placeholderTextColor={Colors.dark.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Markdown Content */}
            <Text style={styles.label}>MARKDOWN CONTENT</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              placeholder="Use markdown: ## Headings, - Bullet points, `code`..."
              placeholderTextColor={Colors.dark.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />

            {/* Tags Section */}
            <Text style={styles.label}>TAGS</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, styles.tagInputField]}
                placeholder="Type tag & press enter"
                placeholderTextColor={Colors.dark.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={() => addTag(tagInput)}
                returnKeyType="done"
              />
              <Pressable style={styles.addTagBtn} onPress={() => addTag(tagInput)}>
                <Text style={styles.addTagText}>+ Add</Text>
              </Pressable>
            </View>

            {/* Selected Tags Chips */}
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((t) => (
                  <Pressable key={t} onPress={() => removeTag(t)}>
                    <GradientBadge
                      label={`#${t} ✕`}
                      color={Colors.dark.synapse}
                      variant="solid"
                    />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Available tag suggestions */}
            {availableTags.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Suggested:</Text>
                <View style={styles.suggestionsRow}>
                  {availableTags
                    .filter((t) => !tags.includes(t))
                    .slice(0, 5)
                    .map((t) => (
                      <Pressable key={t} onPress={() => addTag(t)}>
                        <GradientBadge label={`+ #${t}`} color={Colors.dark.textSecondary} variant="outline" />
                      </Pressable>
                    ))}
                </View>
              </View>
            )}

            {/* Pin Toggle */}
            <Pressable
              style={styles.pinRow}
              onPress={() => setIsPinned(!isPinned)}>
              <View
                style={[
                  styles.checkbox,
                  isPinned && { backgroundColor: Colors.dark.synapse, borderColor: Colors.dark.synapse },
                ]}>
                {isPinned && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.pinLabel}>📌 Pin to top of Synapse & Daily Canvas</Text>
            </Pressable>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, (!title.trim() || submitting) && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={!title.trim() || submitting}>
              <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save Note'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    maxHeight: '90%',
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  closeText: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.one,
    marginTop: Spacing.two,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    color: Colors.dark.text,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  contentInput: {
    height: 120,
    lineHeight: 22,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tagInputField: {
    flex: 1,
  },
  addTagBtn: {
    backgroundColor: `${Colors.dark.synapse}25`,
    borderColor: Colors.dark.synapse,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagText: {
    color: Colors.dark.synapse,
    fontWeight: '700',
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  suggestionsContainer: {
    marginTop: Spacing.two,
  },
  suggestionsTitle: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.one,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pinLabel: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundElement,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.synapse,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
