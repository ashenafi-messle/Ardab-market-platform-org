import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { MOCK_PRODUCTS } from '@/constants/mockData';
import { Product } from '@/types';
import { productService } from '@/services/productService';
import { SearchBar, Chip } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { useApp } from '@/store';
import { t } from '@/localization';

export default function SearchScreen() {
  const router = useRouter();
  const { language } = useApp();
  const [query, setQuery] = useState('');
  const [liveProducts, setLiveProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [recentSearches, setRecentSearches] = useState([
    'Teff Magna 25kg',
    'Yirgacheffe coffee',
    'Habesha Kemis',
    'Electric Mitad',
  ]);

  useEffect(() => {
    productService.fetchProducts().then((items) => {
      if (items && items.length > 0) {
        setLiveProducts(items);
      }
    });
  }, []);

  const popularSearches = [
    'Teff Magna',
    'Berbere',
    'Yirgacheffe',
    'White Honey',
    'Habesha Kemis',
    'Power Bank',
    'Clay Jebena',
  ];

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return liveProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.nameAmharic && p.nameAmharic.includes(q)) ||
        (p.origin && p.origin.toLowerCase().includes(q))
    );
  }, [query, liveProducts]);

  const handleSearchSubmit = () => {
    if (query.trim() && !recentSearches.includes(query.trim())) {
      setRecentSearches((prev) => [query.trim(), ...prev.slice(0, 5)]);
    }
  };

  const handleSelectTerm = (term: string) => {
    setQuery(term);
    if (!recentSearches.includes(term)) {
      setRecentSearches((prev) => [term, ...prev.slice(0, 5)]);
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmit={handleSearchSubmit}
            onClear={() => setQuery('')}
            placeholder={t('home.searchPlaceholder')}
            autoFocus
          />
        </View>
      </View>

      {/* When query is empty, show Recent Searches & Popular Searches */}
      {!query.trim() ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsContainer}>
          {/* Recent Searches */}
          {recentSearches.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('search.recent')}</Text>
                <TouchableOpacity onPress={handleClearRecent}>
                  <Text style={styles.clearText}>{t('search.clearRecent')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsWrap}>
                {recentSearches.map((term, index) => (
                  <Chip
                    key={index}
                    label={term}
                    icon={<Ionicons name="time-outline" size={14} color={Colors.textSecondary} />}
                    onPress={() => handleSelectTerm(term)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Popular Searches */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('search.popular')}</Text>
            </View>
            <View style={styles.chipsWrap}>
              {popularSearches.map((term, index) => (
                <Chip
                  key={index}
                  label={term}
                  icon={<Ionicons name="trending-up" size={14} color={Colors.primary} />}
                  onPress={() => handleSelectTerm(term)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Results View */
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {t('search.resultsCount', { count: searchResults.length })}
            </Text>
          </View>
          <ProductGrid
            products={searchResults}
            emptyTitle={t('search.noResults')}
            emptyMessage={t('search.noResultsSub')}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrapper: {
    flex: 1,
  },
  suggestionsContainer: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  clearText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resultsCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});
