import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../services/auth.service';
import { searchLibrary, fetchLibraryModels, fetchManufacturers, LibrarySearchResult, LibraryModel } from '../services/library-api.service';
import { ColorsType } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';

const ResultCard = React.memo(({ item, onPress, styles, colors }: { item: any; onPress: (id: string, type: string) => void; styles: any; colors: ColorsType }) => {
  if (item.type) {
    return (
      <Pressable onPress={() => onPress(item.id, item.type)}>
        <Card style={{ borderColor: '#bfdbfe', marginBottom: 12 }}>
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
                  {item.type === 'fault' ? 'Fault' : item.type === 'model' ? 'Model' : 'Part'}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
          <Text style={styles.cardSubtitle}>{item.category}</Text>
          {item.description ? (
            <Text style={styles.cardSummary} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </Card>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => onPress(item.id, 'model')}>
      <Card style={{ marginBottom: 12 }}>
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
        {item.description ? (
          <Text style={styles.cardSummary}>{item.description}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
});

export default function DocumentationScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();

  const [query, setQuery]           = useState('');
  const [activePill, setActivePill] = useState<string>('All');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [manufacturerFilter, setManufacturerFilter] = useState<string | undefined>(undefined);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  
  const [models, setModels]         = useState<LibraryModel[]>([]);
  const [modelsPage, setModelsPage] = useState(1);
  const [hasMoreModels, setHasMoreModels] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);

  const [results, setResults]       = useState<LibrarySearchResult[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loading, setLoading]       = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CATEGORY_PILLS = useMemo(() => {
    return ['All', 'Boilers', 'Fault Codes', 'Parts', ...manufacturers];
  }, [manufacturers]);

  useEffect(() => {
    if (!token) return;
    setModelsLoading(true);
    setModelsPage(1);
    setHasMoreModels(true);
    
    fetchLibraryModels(token, 1)
      .then((modelsRes) => {
        setModels(modelsRes);
        if (modelsRes.length < 20) setHasMoreModels(false);
      })
      .catch(console.error)
      .finally(() => setModelsLoading(false));

    fetchManufacturers(token)
      .then((mfgRes) => {
        setManufacturers(mfgRes);
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!token || (!q && activePill === 'All')) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchPage(1);
    setHasMoreResults(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchLibrary(token, q, filterType, manufacturerFilter, 1);
        const newResults = Array.isArray(res) ? res : [];
        setResults(newResults);
        if (newResults.length < 20) setHasMoreResults(false);
      } catch (err) {
        console.error('API search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filterType, manufacturerFilter, activePill, token]);

  const hasQuery    = query.trim().length > 0;
  const isSearching = hasQuery || activePill !== 'All';
  const displayList = isSearching ? results : models;
  const displayCount = displayList.length;

  const loadMore = async () => {
    if (loadingMore || loading || modelsLoading) return;
    if (isSearching && !hasMoreResults) return;
    if (!isSearching && !hasMoreModels) return;

    setLoadingMore(true);
    try {
      if (isSearching) {
        const nextPage = searchPage + 1;
        const res = await searchLibrary(token!, query.trim(), filterType, manufacturerFilter, nextPage);
        const newResults = Array.isArray(res) ? res : [];
        setResults(prev => [...prev, ...newResults]);
        setSearchPage(nextPage);
        if (newResults.length < 20) setHasMoreResults(false);
      } else {
        const nextPage = modelsPage + 1;
        const newModels = await fetchLibraryModels(token!, nextPage);
        setModels(prev => [...prev, ...newModels]);
        setModelsPage(nextPage);
        if (newModels.length < 20) setHasMoreModels(false);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  function handlePill(pill: string) {
    setActivePill(pill);
    setQuery('');
    setResults([]);
    if (pill === 'All') {
      setFilterType(undefined);
      setManufacturerFilter(undefined);
    } else if (pill === 'Boilers') {
      setFilterType('model');
      setManufacturerFilter(undefined);
    } else if (pill === 'Fault Codes') {
      setFilterType('fault');
      setManufacturerFilter(undefined);
    } else if (pill === 'Parts') {
      setFilterType('part');
      setManufacturerFilter(undefined);
    } else {
      setFilterType('all');
      setManufacturerFilter(pill);
    }
  }

  const handlePressCard = useCallback((id: string, type: string) => {
    if (type === 'model') router.push(`/model/${id}`);
    else if (type === 'fault') router.push(`/fault/${id}`);
    else if (type === 'part') router.push(`/part/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return <ResultCard item={item} onPress={handlePressCard} styles={styles} colors={colors} />;
  }, [handlePressCard, styles, colors]);

  const header = (
    <ScreenHeader title={t('documentation.title')} iconName="document-text-outline">
      <Text style={styles.headerCopy}>{t('documentation.header_copy')}</Text>

      <View style={styles.searchPanel}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            value={query}
            onChangeText={text => setQuery(text)}
            placeholder={t('documentation.search_placeholder')}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {hasQuery && !loading && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          )}
          {(loading && hasQuery) && <ActivityIndicator size="small" color={colors.blue} />}
        </View>
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

  const renderHeader = () => (
    <>
      {!isSearching && !modelsLoading && models.length > 0 && (
        <Card style={[styles.heroCard, { marginBottom: 16 }]}>
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
              <Text style={styles.heroStatLabel}>{t('documentation.stat_models') ?? 'Models'}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>{CATEGORY_PILLS.length}</Text>
              <Text style={styles.heroStatLabel}>{t('documentation.stat_categories') ?? 'Categories'}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>{'↗'}</Text>
              <Text style={styles.heroStatLabel}>{t('documentation.stat_search') ?? 'Search'}</Text>
            </View>
          </View>
        </Card>
      )}

      <SectionHeader
        title={isSearching ? t('documentation.search_results') : t('documentation.popular_references')}
        count={displayCount}
      />

      {((isSearching ? loading : modelsLoading) && displayCount === 0) && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      )}

      {!loading && !modelsLoading && displayCount === 0 && (
        <Card style={styles.emptyCard}>
          <Ionicons name="search-outline" size={26} color="#94a3b8" />
          <Text style={styles.emptyTitle}>
            {isSearching ? t('documentation.empty_title') : 'No models in library'}
          </Text>
          <Text style={styles.emptyText}>
            {isSearching
              ? t('documentation.empty_text')
              : 'Use the POST /library/ingest endpoint to add documentation.'}
          </Text>
        </Card>
      )}
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreWrap}>
        <ActivityIndicator size="small" color={colors.blue} />
      </View>
    );
  };

  return (
    <Screen header={header} noScroll={true}>
      <FlatList
        data={displayList}
        keyExtractor={item => (item.type || 'model') + '-' + item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />
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
  loadingMoreWrap: {
    paddingVertical: 16,
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
