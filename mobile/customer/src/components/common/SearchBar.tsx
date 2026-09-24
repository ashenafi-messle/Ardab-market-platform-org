import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import { AppText } from './AppText';

export interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  onPress?: () => void; // If provided, behaves as a touchable bar navigating to search
  onFilterPress?: () => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  onChangeText,
  onSubmit,
  onClear,
  onPress,
  onFilterPress,
  placeholder = 'Search products, brands...',
  editable = true,
  autoFocus = false,
  style,
}) => {
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.container, style]}>
        <Ionicons name="search-outline" size={20} color={Colors.primary} style={styles.icon} />
        <AppText variant="body" color={Colors.textMuted} style={styles.placeholderText} numberOfLines={1}>
          {placeholder}
        </AppText>
        {onFilterPress ? (
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={(e) => {
              e.stopPropagation();
              onFilterPress();
            }}>
            <Ionicons name="options-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={20} color={Colors.primary} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        editable={editable}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ) : onFilterPress ? (
        <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress}>
          <Ionicons name="options-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md + 2,
    height: 46,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  placeholderText: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
