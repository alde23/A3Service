import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../services/auth.service';
import { searchLibrary, LibrarySearchResult } from '../services/library-api.service';
import { C } from '../theme/colors';

type DocumentationItem = {
  id: string;
  title: string;
  category: string;
  subtitle: string;
  summary: string;
  keywords: string[];
  accent: 'blue' | 'amber' | 'emerald' | 'slate';
};

const DOCUMENTATION_ITEMS: DocumentationItem[] = [
  {
    id: 'boiler-basics',
    title: 'Boiler Basics',
    category: 'Boilers',
    subtitle: 'Start here for common boiler checks',
    summary:
      'Overview of pressure, flame lockout, condensate issues, ignition checks, and the first steps before deeper diagnostics.',
    keywords: ['boiler', 'pressure', 'ignition', 'condensate', 'lockout'],
    accent: 'blue',
  },
  {
    id: 'vaillant-combi',
    title: 'Vaillant Combi Boilers',
    category: 'Vaillant',
    subtitle: 'Frequent faults and fast checks',
    summary:
      'Common Vaillant combi symptoms, what to inspect first, and where to look when the customer reports no heat or hot water.',
    keywords: ['vaillant', 'ecotec', 'combi', 'hot water', 'no heat'],
    accent: 'emerald',
  },
  {
    id: 'fault-f22',
    title: 'Fault Code F22',
    category: 'Fault Codes',
    subtitle: 'Low pressure or dry fire prevention',
    summary:
      'What F22 means, how to confirm the pressure reading, and the usual reset path before replacing parts.',
    keywords: ['f22', 'fault code', 'pressure', 'reset', 'vaillant'],
    accent: 'amber',
  },
  {
    id: 'fault-f28',
    title: 'Fault Code F28',
    category: 'Fault Codes',
    subtitle: 'Ignition failure and gas supply checks',
    summary:
      'Useful checks for ignition failure, gas isolation, electrode condition, and when the fault repeats after reset.',
    keywords: ['f28', 'ignition', 'gas', 'electrode', 'fault code'],
    accent: 'slate',
  },
  {
    id: 'system-pressure',
    title: 'System Pressure Guide',
    category: 'Quick Checks',
    subtitle: 'Most requested field reference',
    summary:
      'A simple guide for pressure top-up, leak spotting, and when pressure drops point to a bigger issue.',
    keywords: ['pressure', 'top up', 'leak', 'boiler', 'quick check'],
    accent: 'blue',
  },
  {
    id: 'reset-procedure',
    title: 'Reset Procedure',
    category: 'Quick Checks',
    subtitle: 'When a reset is safe to try',
    summary:
      'A short checklist to follow before resetting any appliance, with notes on when to stop and escalate.',
    keywords: ['reset', 'safety', 'fault code', 'quick check'],
    accent: 'emerald',
  },
];

const CATEGORY_PILLS = [
  'Boilers',
  'Vaillant',
  'Fault Codes',
  'Quick Checks',
  'Pressure',
  'Ignition',
];

const HIGHLIGHT_ITEMS = [
  'Boiler pressure checks',
  'Vaillant error codes',
  'Reset procedures',
  'Flame and ignition faults',
];

function accentColors(accent: DocumentationItem['accent']) {
  if (accent === 'blue') {
    return {
      pillBg: C.blueSoft,
      pillText: C.blue,
      border: '#1d4ed8',
      cardBg: C.surface1,
      accentLine: C.blue,
    };
  }

  if (accent === 'amber') {
    return {
      pillBg: C.amberSoft,
      pillText: C.amber,
      border: '#92400e',
      cardBg: C.surface1,
      accentLine: C.amber,
    };
  }

  if (accent === 'emerald') {
    return {
      pillBg: C.greenSoft,
      pillText: C.green,
      border: '#065f46',
      cardBg: C.surface1,
      accentLine: C.green,
    };
  }

  return {
    pillBg: C.surface2,
    pillText: C.textSecondary,
    border: C.border2,
    cardBg: C.surface1,
    accentLine: C.border2,
  };
}

export default function DocumentationScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [apiResults, setApiResults] = useState<LibrarySearchResult[]>([]);
  const [useApiSearch, setUseApiSearch] = useState(false);

  // Handle API search
  useEffect(() => {
    if (!token || !query.trim() || !useApiSearch) {
      setApiResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        const results = await searchLibrary(token, query);
        setApiResults(results);
      } catch (error) {
        console.error('API search error:', error);
        setApiResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, token, useApiSearch]);

  // Local search fallback
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return DOCUMENTATION_ITEMS;
    }

    return DOCUMENTATION_ITEMS.filter((item) => {
      const searchableText = [
        item.title,
        item.category,
        item.subtitle,
        item.summary,
        ...item.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, useApiSearch]);

  const hasQuery = query.trim().length > 0;
  const displayItems = useApiSearch && apiResults.length > 0 ? apiResults : filteredItems;
  const itemCount = displayItems.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={18} color={C.textPrimary} />
          </View>
          <Text style={styles.headerTitle}>{t('documentation.title')}</Text>
        </View>

        <Text style={styles.headerCopy}>{t('documentation.header_copy')}</Text>

        <View style={styles.searchPanel}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('documentation.search_placeholder')}
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>

          <Pressable
            style={styles.searchButton}
            onPress={() => setUseApiSearch(query.trim().length > 0)}
          >
            <Text style={styles.searchButtonText}>{t('documentation.search')}</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {CATEGORY_PILLS.map((pill) => (
            <View key={pill} style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{pill}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {hasQuery ? t('documentation.search_results') : t('documentation.popular_references')}
          </Text>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{itemCount} items</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t('documentation.top_topics')}</Text>
            </View>
            <Ionicons name="library-outline" size={20} color="#2563eb" />
          </View>

          <Text style={styles.heroTitle}>{t('documentation.hero_title')}</Text>

          <View style={styles.heroList}>
            {HIGHLIGHT_ITEMS.map((item) => (
              <View key={item} style={styles.heroListItem}>
                <View style={styles.heroDot} />
                <Text style={styles.heroListText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {itemCount === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={26} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No matching documentation found</Text>
            <Text style={styles.emptyText}>
              Try a fault code like F22, a brand like Vaillant, or a keyword like pressure.
            </Text>
          </View>
        ) : useApiSearch && apiResults.length > 0 ? (
          // API search results
          apiResults.map((item) => (
            <View key={item.id} style={[styles.card, { borderColor: '#bfdbfe' }]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardMetaRow}>
                  <View style={[styles.categoryTag, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[styles.categoryTagText, { color: '#1d4ed8' }]}>
                      {item.type}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
              <Text style={styles.cardSubtitle}>{item.category}</Text>
              {item.description && (
                <Text style={styles.cardSummary}>{item.description}</Text>
              )}
            </View>
          ))
        ) : (
          // Local search results
          filteredItems.map((item) => {
            const colors = accentColors(item.accent);

            return (
              <View key={item.id} style={[styles.card, { borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardMetaRow}>
                    <View style={[styles.categoryTag, { backgroundColor: colors.pillBg }]}>
                      <Text style={[styles.categoryTagText, { color: colors.pillText }]}>
                        {item.category}
                      </Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>

                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                <Text style={styles.cardSummary}>{item.summary}</Text>

                <View style={styles.keywordRow}>
                  {item.keywords.slice(0, 4).map((keyword) => (
                    <View
                      key={keyword}
                      style={[styles.keywordPill, { backgroundColor: colors.cardBg }]}
                    >
                      <Text style={styles.keywordText}>{keyword}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.surface3,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
  },
  headerTitle: {
    color: C.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerCopy: {
    marginTop: 8,
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  searchPanel: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface2,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 54,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
  },
  searchButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  searchButtonText: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillsRow: {
    paddingTop: 12,
    paddingBottom: 2,
    gap: 8,
  },
  categoryPill: {
    borderRadius: 999,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    height: 32,
  },
  categoryPillText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
  },
  sectionTitle: {
    color: C.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.surface2,
  },
  counterText: {
    color: C.blue,
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: C.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
    padding: 16,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    backgroundColor: C.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: C.blue,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: C.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  heroList: {
    marginTop: 12,
    gap: 8,
  },
  heroListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.blue,
  },
  heroListText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  card: {
    backgroundColor: C.surface1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardMetaRow: {
    flex: 1,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    color: C.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  cardSummary: {
    marginTop: 10,
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  keywordRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  keywordText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  emptyCard: {
    backgroundColor: C.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
