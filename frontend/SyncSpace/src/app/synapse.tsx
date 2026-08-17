import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BottomTabInset, BorderRadius } from '@/constants/theme';
import { HeaderBar } from '@/components/ui/HeaderBar';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { SynapseCard, SynapseNote } from '@/components/synapse/SynapseCard';
import { CreateNoteModal } from '@/components/synapse/CreateNoteModal';
import { BinaryConvertModal } from '@/components/synapse/BinaryConvertModal';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function SynapseScreen() {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<SynapseNote[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'archived'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SynapseNote | null>(null);
  const [convertingNote, setConvertingNote] = useState<SynapseNote | null>(null);

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedTag) params.tag = selectedTag;
      if (activeFilter === 'pinned') params.is_pinned = true;
      if (activeFilter === 'archived') {
        params.is_archived = true;
      } else {
        params.is_archived = false;
      }

      const [notesRes, tagsRes] = await Promise.all([
        api.getSynapses(params),
        api.getTags(),
      ]);

      if (notesRes && notesRes.data && notesRes.data.notes) {
        setNotes(notesRes.data.notes);
      }
      if (tagsRes && tagsRes.data && tagsRes.data.tags) {
        setAvailableTags(tagsRes.data.tags);
      }
    } catch {
      // Fallback
    }
  }, [searchQuery, selectedTag, activeFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [isAuthenticated, loadData]);

  const onRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSaveNote = async (noteData: {
    title: string;
    content: string;
    tags: string[];
    is_pinned: boolean;
  }) => {
    if (editingNote) {
      await api.updateSynapse(editingNote.id, noteData);
    } else {
      await api.createSynapse(noteData);
    }
    setEditingNote(null);
    await loadData();
  };

  const handleDeleteNote = async (id: string) => {
    await api.deleteSynapse(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleTogglePin = async (note: SynapseNote) => {
    await api.updateSynapse(note.id, { is_pinned: !note.is_pinned });
    await loadData();
  };

  const handleToggleArchive = async (note: SynapseNote) => {
    await api.updateSynapse(note.id, { is_archived: !note.is_archived });
    await loadData();
  };

  const handleConvertNote = async (
    synapseId: string,
    payload: {
      title?: string;
      description?: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      due_date: string;
      due_time?: string | null;
      archive_note?: boolean;
    }
  ) => {
    await api.convertSynapse(synapseId, payload);
    setConvertingNote(null);
    await loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.synapse}
          />
        }>
        {/* Header */}
        <HeaderBar
          title="Synapse Notes"
          subtitle="Rapid Markdown & Atomic Binary Conversion"
          accentColor={Colors.dark.synapse}
          rightAction={{
            label: '+ Capture',
            onPress: () => {
              setEditingNote(null);
              setIsCreateModalOpen(true);
            },
          }}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search notes or markdown content..."
            placeholderTextColor={Colors.dark.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersRow}>
          {(['all', 'pinned', 'archived'] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterButton,
                activeFilter === filter && {
                  backgroundColor: `${Colors.dark.synapse}25`,
                  borderColor: Colors.dark.synapse,
                },
              ]}>
              <Text
                style={[
                  styles.filterText,
                  { color: activeFilter === filter ? Colors.dark.synapse : Colors.dark.textSecondary },
                ]}>
                {filter.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tags Carousel */}
        {availableTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsCarousel}>
            <Pressable onPress={() => setSelectedTag(null)}>
              <GradientBadge
                label="All Tags"
                color={selectedTag === null ? Colors.dark.synapse : Colors.dark.textSecondary}
                variant={selectedTag === null ? 'solid' : 'outline'}
              />
            </Pressable>
            {availableTags.map((tag) => (
              <Pressable key={tag} onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}>
                <GradientBadge
                  label={`#${tag}`}
                  color={selectedTag === tag ? Colors.dark.synapse : Colors.dark.textSecondary}
                  variant={selectedTag === tag ? 'solid' : 'outline'}
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Notes List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.synapse} />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyTitle}>No Synapse Notes Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedTag
                ? 'Try clearing your filters or search terms.'
                : 'Capture your first markdown insight or thought above.'}
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => {
                setEditingNote(null);
                setIsCreateModalOpen(true);
              }}>
              <Text style={styles.emptyButtonText}>+ Capture Note</Text>
            </Pressable>
          </View>
        ) : (
          notes.map((note) => (
            <SynapseCard
              key={note.id}
              note={note}
              onEdit={(n) => {
                setEditingNote(n);
                setIsCreateModalOpen(true);
              }}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDeleteNote}
              onConvert={(n) => setConvertingNote(n)}
            />
          ))
        )}
      </ScrollView>

      {/* Note Creation / Editing Modal */}
      <CreateNoteModal
        visible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingNote(null);
        }}
        onSubmit={handleSaveNote}
        initialNote={editingNote}
        availableTags={availableTags}
      />

      {/* Atomic Binary Conversion Modal */}
      <BinaryConvertModal
        visible={!!convertingNote}
        onClose={() => setConvertingNote(null)}
        note={convertingNote}
        onConvert={handleConvertNote}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContainer: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  searchInput: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    color: Colors.dark.text,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  filterButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.backgroundElement,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagsCarousel: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: Spacing.one,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  emptyButton: {
    backgroundColor: Colors.dark.synapse,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
