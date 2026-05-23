import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/Config';

interface ChronicleItem {
  id: string;
  type: 'report' | 'correction';
  author: string;
  avatar: string;
  isWarrior: boolean;
  date: string;
  text: string;
  studied: boolean;
  studiedCount: number;
  warriorCount: number;
  reactions: { emoji: string; count: number; active: boolean }[];
}

export default function ChroniclesScreen() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ChronicleItem[]>([
    {
      id: '1',
      type: 'report',
      author: 'Елена Сорокина',
      avatar: 'Е',
      isWarrior: false,
      date: '14.05 · 09:12',
      text: 'Замечаю, что внимание держится дольше в тишине, но рассеивается при разговоре. Практику Гудения делаю утром. Появляется ровность, но к вечеру теряю её.',
      studied: true,
      studiedCount: 18,
      warriorCount: 2,
      reactions: [
        { emoji: '🙏', count: 4, active: true },
        { emoji: '👁', count: 2, active: false }
      ]
    },
    {
      id: '2',
      type: 'correction',
      author: 'Галя Мурзина',
      avatar: 'Г',
      isWarrior: true,
      date: '14.05 · 09:48',
      text: 'Усилие — это не напряжение тела, а возвращение внимания. Напряжение, наоборот, признак того, что ты пытаешься «сделать» вместо того, чтобы быть. Перечитай Указатель об опоре.',
      studied: false,
      studiedCount: 24,
      warriorCount: 3,
      reactions: [
        { emoji: '🙏', count: 8, active: false },
        { emoji: '💡', count: 5, active: true }
      ]
    },
    {
      id: '3',
      type: 'report',
      author: 'Дмитрий Ковалев',
      avatar: 'Д',
      isWarrior: false,
      date: '13.05 · 18:30',
      text: 'Отчёт по практике. Во время гудения чувствую вибрацию в груди, которая помогает заякорить внимание. Буду продолжать в течение дня.',
      studied: false,
      studiedCount: 12,
      warriorCount: 1,
      reactions: [
        { emoji: '👍', count: 3, active: false }
      ]
    }
  ]);

  const toggleStudied = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          studied: !item.studied,
          studiedCount: item.studied ? item.studiedCount - 1 : item.studiedCount + 1
        };
      }
      return item;
    }));
  };

  const toggleReaction = (itemId: string, emoji: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          reactions: item.reactions.map(r => {
            if (r.emoji === emoji) {
              return {
                ...r,
                active: !r.active,
                count: r.active ? r.count - 1 : r.count + 1
              };
            }
            return r;
          })
        };
      }
      return item;
    }));
  };

  const filteredItems = items.filter(item => 
    item.author.toLowerCase().includes(search.toLowerCase()) ||
    item.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Svg width={16} height={16} viewBox="0 0 20 20" fill="none" style={styles.searchIcon}>
            <Circle cx="9" cy="9" r="6.5" stroke={COLORS.textSecondary} strokeWidth={1.6} />
            <Path d="M14 14l4 4" stroke={COLORS.textSecondary} strokeWidth={1.6} strokeLinecap="round" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по летописям..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {filteredItems.map((item) => (
          <View key={item.id} style={styles.chronicleCard}>
            
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, item.isWarrior && styles.avatarWarrior]}>
                <Text style={[styles.avatarText, item.isWarrior && styles.avatarTextWarrior]}>
                  {item.avatar}
                </Text>
              </View>
              
              <View style={styles.authorInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>
                    {item.author} {item.isWarrior && '◈'}
                  </Text>
                  <View style={[
                    styles.tagBadge, 
                    item.type === 'correction' ? styles.correctionTag : styles.reportTag
                  ]}>
                    <Text style={[
                      styles.tagBadgeText,
                      item.type === 'correction' ? styles.correctionTagText : styles.reportTagText
                    ]}>
                      {item.type === 'correction' ? 'Корректировка' : 'Отчёт'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardDate}>{item.date}</Text>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <Text style={styles.cardText}>{item.text}</Text>
            </View>

            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.studiedRow}>
                <TouchableOpacity 
                  onPress={() => toggleStudied(item.id)} 
                  style={[styles.btnStudy, item.studied && styles.btnStudyDone]}
                >
                  <Text style={[styles.btnStudyText, item.studied && styles.btnStudyTextDone]}>
                    {item.studied ? '✓ Изучен' : 'Изучить'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.studiedStat}>
                  изучили {item.studiedCount} · <Text style={{ color: COLORS.amber }}>◈ {item.warriorCount}</Text>
                </Text>
              </View>

              <View style={styles.reactRow}>
                <Text style={styles.reactLabel}>реакции</Text>
                {item.reactions.map((r, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    onPress={() => toggleReaction(item.id, r.emoji)}
                    style={[styles.reactChip, r.active && styles.reactChipActive]}
                  >
                    <Text style={styles.reactChipText}>{r.emoji} {r.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        ))}
        {filteredItems.length === 0 && (
          <Text style={styles.emptyText}>Ничего не найдено</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCFAF5',
    borderColor: '#ECE7DD',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    padding: 0,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  chronicleCard: {
    backgroundColor: '#fff',
    borderColor: '#ECE7DD',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#ECE7DD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWarrior: {
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberGlow,
  },
  avatarText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
  },
  avatarTextWarrior: {
    color: COLORS.amber,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorName: {
    fontSize: 14.5,
    fontFamily: FONTS.displaySemiBold,
    color: COLORS.textPrimary,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  reportTag: {
    backgroundColor: '#F4F1EA',
  },
  correctionTag: {
    backgroundColor: '#FCF4E3',
  },
  tagBadgeText: {
    fontSize: 8.5,
    fontFamily: FONTS.monoMedium,
    textTransform: 'uppercase',
  },
  reportTagText: {
    color: COLORS.textSecondary,
  },
  correctionTagText: {
    color: COLORS.amber,
  },
  cardDate: {
    fontSize: 10.5,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardBody: {
    marginTop: 12,
  },
  cardText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
  },
  cardFooter: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F4F1EA',
    paddingTop: 12,
  },
  studiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnStudy: {
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  btnStudyDone: {
    backgroundColor: '#FCF4E3',
    borderColor: '#F0DFB8',
    borderWidth: 1,
  },
  btnStudyText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  btnStudyTextDone: {
    color: COLORS.amber,
  },
  studiedStat: {
    fontSize: 11.5,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    marginLeft: 12,
  },
  reactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  reactLabel: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginRight: 10,
  },
  reactChip: {
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  reactChipActive: {
    backgroundColor: '#FAF1DC',
    borderColor: '#F0DFB8',
    borderWidth: 1,
  },
  reactChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    marginTop: 40,
  },
});
