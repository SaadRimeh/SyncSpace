import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBadge } from '@/components/ui/GradientBadge';

export interface SynapseNote {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  tags?: string[];
  is_pinned: boolean;
  is_archived: boolean;
  converted_to_task_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface SynapseCardProps {
  note: SynapseNote;
  onEdit: (note: SynapseNote) => void;
  onTogglePin: (note: SynapseNote) => void;
  onToggleArchive: (note: SynapseNote) => void;
  onDelete: (id: string) => void;
  onConvert: (note: SynapseNote) => void;
}

export const SynapseCard: React.FC<SynapseCardProps> = ({
  note,
  onEdit,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onConvert,
}) => {
  const isConverted = !!note.converted_to_task_id;

  return (
    <GlassCard
      accentColor={note.is_pinned ? Colors.dark.synapse : undefined}
      glow={note.is_pinned}
      style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {note.title}
          </Text>
        </View>

        <View style={styles.badgesRow}>
          {note.is_pinned && <GradientBadge label="📌 Pinned" color={Colors.dark.synapse} />}
          {isConverted && <GradientBadge label="⚡ Converted" color={Colors.dark.tasks} />}
          {note.is_archived && <GradientBadge label="Archived" color={Colors.dark.textMuted} />}
        </View>
      </View>

      {/* Content Snippet */}
      {note.content ? (
        <Text style={styles.contentSnippet} numberOfLines={4}>
          {note.content}
        </Text>
      ) : null}

      {/* Tags Carousel */}
      {note.tags && note.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {note.tags.map((t) => (
            <GradientBadge
              key={t}
              label={`#${t}`}
              color={Colors.dark.synapse}
              variant="outline"
            />
          ))}
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.footer}>
        <View style={styles.leftActions}>
          <Pressable
            onPress={() => onTogglePin(note)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionIcon}>{note.is_pinned ? '📍' : '📌'}</Text>
          </Pressable>

          <Pressable
            onPress={() => onToggleArchive(note)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionIcon}>{note.is_archived ? '📂' : '📁'}</Text>
          </Pressable>

          <Pressable
            onPress={() => onEdit(note)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionIcon}>✏️</Text>
          </Pressable>

          <Pressable
            onPress={() => onDelete(note.id)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </Pressable>
        </View>

        {/* Convert to Task CTA */}
        {!isConverted && (
          <Pressable
            onPress={() => onConvert(note)}
            style={({ pressed }) => [styles.convertBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.convertBtnText}>⚡ Convert</Text>
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    lineHeight: 22,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  contentSnippet: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBtn: {
    padding: Spacing.one,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundElement,
  },
  actionIcon: {
    fontSize: 14,
  },
  convertBtn: {
    backgroundColor: `${Colors.dark.tasks}25`,
    borderColor: Colors.dark.tasks,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.full,
  },
  convertBtnText: {
    color: Colors.dark.tasks,
    fontSize: 12,
    fontWeight: '800',
  },
});
