import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../services/auth.service';
import { searchLibrary, fetchLibraryModels, LibrarySearchResult, LibraryModel } from '../services/library-api.service';
import { ColorsType } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';

const CATEGORY_PILLS = [
  'Boilers',
  'Vaillant',
  'Baxi',
  'Fault Codes',
  'Pressure',
  'Ignition',
];

export default function DocumentationScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();

  const [query, setQuery]           = useState('');
  const [activePill, setActivePill] = useState<string | null>(null);
  const [models, setModels]         = useState<LibraryModel[]>([]);
  const [results, setResults]       = useState<LibrarySearchResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    setModelsLoading(true);
    fetchLibraryModels(token)
      .then(res => setModels(res))
      .catch(console.error)
      .finally(() => setModelsLoading(false));
  }, [token]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!token || !q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchLibrary(token, q);
        setResults(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('API search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, token]);

  const hasQuery    = query.trim().length > 0;
  const isSearching = hasQuery;
  const displayList = isSearching ? results : models;
  const displayCount = displayList.length;

  function handlePill(pill: string) {
    if (activePill === pill) {
      setActivePill(null);
      setQuery('');
    } else {
      setActivePill(pill);
      setQuery(pill);
    }
  }

  const header = (
    <ScreenHeader title={t('documentation.title')} iconName="document-text-outline">
      <Text style={styles.headerCopy}>{t('documentation.header_copy')}</Text>

      <View style={styles.searchPanel}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            value={query}
            onChangeText={text => { setQuery(text); setActivePill(null); }}
            placeholder={t('documentation.search_placeholder')}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {loading && <ActivityIndicator size="small" color={colors.blue} />}
        </View>

        <Pressable
          style={styles.searchButton}
          onPress={() => { setQuery(''); setActivePill(null); }}
        >
          <Text style={styles.searchButtonText}>
            {hasQuery ? t('documentation.clear') ?? 'Obriši' : t('documentation.search')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {CATEGORY_PILLS.map((pill) => {
          const isActive = activePill === pill;
          return (
            <Pressable
              key={pill}
              style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              onPress={() => handlePill(pill)}
            >
              <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                {pill}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenHeader>
  );

  return (
    <Screen header={header}>
      {!isSearching && !modelsLoading && models.length > 0 && (
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t('documentation.top_topics')}</Text>
            </View>
            <Ionicons name="library-outline" size={20} color={colors.blue} />
          </View>

          <Text style={styles.heroTitle}>{t('documentation.hero_title')}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>{models.length}</Text>
              <Text style={styles.heroStatLabel}>{t('documentation.stat_models') ?? 'Modeli'}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>{CATEGORY_PILLS.length}</Text>
              <Text style={styles.heroStatLabel}>{t('documentation.stat_categories') ?? 'Kategorije'}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>{'↗'}</Text>
              <Text style={styles.heroStatLabel}>{t('documentation.stat_search') ?? 'Pretraga'}</Text>
            </View>
          </View>
        </Card>
      )}

      <SectionHeader
        title={isSearching ? t('documentation.search_results') : t('documentation.popular_references')}
        count={displayCount}
      />

      {(isSearching ? loading : modelsLoading) && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      )}

      {!loading && !modelsLoading && displayCount === 0 && (
        <Card style={styles.emptyCard}>
          <Ionicons name="search-outline" size={26} color="#94a3b8" />
          <Text style={styles.emptyTitle}>
            {isSearching ? 'Nema rezultata' : 'Nema modela u biblioteci'}
          </Text>
          <Text style={styles.emptyText}>
            {isSearching
              ? `Pokušajte kod greške kao E01, brend kao Vaillant ili ključnu riječ kao pritisak.`
              : 'Koristite POST /library/ingest endpoint za dodavanje dokumentacije.'}
          </Text>
        </Card>
      )}

      {isSearching && !loading && results.map((item) => (
        <Pressable 
          key={item.id} 
          onPress={() => {
            if (item.type === 'model') router.push(`/model/${item.id}`);
            else if (item.type === 'fault') router.push(`/fault/${item.id}`);
            else if (item.type === 'guide') router.push(`/part/${item.id}`);
          }}
        >
          <Card style={{ borderColor: '#bfdbfe' }}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardMetaRow}>
                <View style={[
                  styles.categoryTag,
                  {
                    backgroundColor:
                      item.type === 'fault' ? '#fee2e2' :
                      item.type === 'model' ? '#dbeafe' : '#dcfce7',
                  }
                ]}>
                  <Text style={[
                    styles.categoryTagText,
                    {
                      color:
                        item.type === 'fault' ? '#dc2626' :
                        item.type === 'model' ? '#1d4ed8' : '#16a34a',
                    }
                  ]}>
                    {item.type === 'fault' ? 'Greška' : item.type === 'model' ? 'Model' : 'Dio'}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
            <Text style={styles.cardSubtitle}>{item.category}</Text>
            {item.description && (
              <Text style={styles.cardSummary} numberOfLines={2}>{item.description}</Text>
            )}
          </Card>
        </Pressable>
      ))}

      {!isSearching && !modelsLoading && models.map((item) => (
        <Pressable 
          key={item.id} 
          onPress={() => router.push(`/model/${item.id}`)}
        >
          <Card>
            <View style={styles.cardTopRow}>
              <View style={styles.cardMetaRow}>
                <View style={[styles.categoryTag, { backgroundColor: colors.blueSoft }]}>
                  <Text style={[styles.categoryTagText, { color: colors.blue }]}>
                    {item.brand}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
            <Text style={styles.cardSubtitle}>{item.category}</Text>
            {item.description && (
              <Text style={styles.cardSummary}>{item.description}</Text>
            )}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  headerCopy: {
    marginTop: 8,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface2,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
  },
  searchButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    height: 32,
  },
  categoryPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  categoryPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  heroCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    backgroundColor: colors.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatNumber: {
    color: colors.blue,
    fontSize: 22,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
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
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  cardSummary: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  emptyTitle: {
    marginTop: 10,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
