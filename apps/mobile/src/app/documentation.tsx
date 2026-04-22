import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
      pillBg: '#dbeafe',
      pillText: '#1d4ed8',
      border: '#bfdbfe',
      cardBg: '#eff6ff',
    };
  }

  if (accent === 'amber') {
    return {
      pillBg: '#fef3c7',
      pillText: '#92400e',
      border: '#fde68a',
      cardBg: '#fffbeb',
    };
  }

  if (accent === 'emerald') {
    return {
      pillBg: '#d1fae5',
      pillText: '#047857',
      border: '#a7f3d0',
      cardBg: '#ecfdf5',
    };
  }

  return {
    pillBg: '#e2e8f0',
    pillText: '#334155',
    border: '#cbd5e1',
    cardBg: '#f8fafc',
  };
}

export default function DocumentationScreen() {
  const [query, setQuery] = useState('');

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
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={18} color="#0f172a" />
          </View>
          <Text style={styles.headerTitle}>Documentation</Text>
        </View>

        <Text style={styles.headerCopy}>
          Search fault codes, boiler types, brands, and quick fixes.
        </Text>

        <View style={styles.searchPanel}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search fault code, keyword, boiler or brand"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>

          <Pressable style={styles.searchButton}>
            <Text style={styles.searchButtonText}>SEARCH</Text>
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
            {hasQuery ? 'Search Results' : 'Popular References'}
          </Text>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{filteredItems.length} items</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Top topics</Text>
            </View>
            <Ionicons name="library-outline" size={20} color="#2563eb" />
          </View>

          <Text style={styles.heroTitle}>
            Fast access to the most used field references.
          </Text>

          <View style={styles.heroList}>
            {HIGHLIGHT_ITEMS.map((item) => (
              <View key={item} style={styles.heroListItem}>
                <View style={styles.heroDot} />
                <Text style={styles.heroListText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={26} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No matching documentation found</Text>
            <Text style={styles.emptyText}>
              Try a fault code like F22, a brand like Vaillant, or a keyword like pressure.
            </Text>
          </View>
        ) : (
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
    backgroundColor: '#f2f5fa',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e40af',
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
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#60a5fa',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '700',
  },
  headerCopy: {
    marginTop: 8,
    color: '#dbeafe',
    fontSize: 16,
    fontWeight: '500',
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
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  searchButton: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillsRow: {
    paddingTop: 12,
    paddingBottom: 2,
    gap: 8,
  },
  categoryPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 22,
    fontWeight: '600',
  },
  counterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  counterText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
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
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2563eb',
  },
  heroListText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
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
    fontWeight: '700',
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  cardSummary: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
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
    paddingVertical: 6,
  },
  keywordText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
