import { Theme } from '@/src/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import Box from '../shared/Box';
import Text from '../shared/Text';

const FILTERS = ['All', 'Sent', 'Received', 'Contract'];

const SearchHeader = ({
  search,
  setSearch,
  activeFilter,
  setActiveFilter,
  theme,
}: {
  search: string;
  setSearch: (t: string) => void;
  activeFilter: string;
  setActiveFilter: (f: string) => void;
  theme: Theme;
}) => (
  <Box paddingHorizontal="m" mt="s" backgroundColor="mainBackground">
    <Box flexDirection="row" alignItems="center" mb="m">
      <Box
        flex={1}
        height={48}
        backgroundColor="bg900"
        borderRadius={12}
        flexDirection="row"
        alignItems="center"
        paddingHorizontal="m"
        borderWidth={1}
        borderColor="bg800"
      >
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search for transactions ..."
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
      </Box>
      <TouchableOpacity style={styles.filterButton}>
        <Ionicons name="filter-outline" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Box>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContainer}
    >
      {FILTERS.map((filter) => (
        <TouchableOpacity
          key={filter}
          onPress={() => setActiveFilter(filter)}
          style={[
            styles.filterChip,
            activeFilter === filter && {
              borderColor: theme.colors.primary700,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <Text variant="p8" color={activeFilter === filter ? 'primary700' : 'textSecondary'}>
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </Box>
);

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SFproRegular',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterContainer: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
  },
});

export default SearchHeader;
