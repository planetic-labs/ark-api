import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { COLORS, FONTS } from '../../constants/Config';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';

// Preset mock details for the premium design lookup based on chat name/id
const getChatDecoration = (name: string) => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('инкубатор')) {
    return {
      avatar: 'И',
      isWarrior: true,
      lastMsgAuthor: 'Мария Л.:',
      lastMsgText: 'Отчёт — 4 пункта, прошу корректировку',
      time: '11:20',
      badge: 2,
      badgeColor: COLORS.textMuted,
    };
  }
  if (normalized.includes('реанимация')) {
    return {
      avatar: 'Р',
      isWarrior: true,
      lastMsgAuthor: '◈ Галя Мурзина:',
      lastMsgText: 'Корректировка по пункту 2 отчёта…',
      time: '10:48',
      badge: 5,
      badgeColor: COLORS.amber,
    };
  }
  if (normalized.includes('материал')) {
    return {
      avatar: 'М',
      isWarrior: false,
      lastMsgAuthor: '',
      lastMsgText: 'Новая нарезка · «Внимание как опора»',
      time: '09:30',
      badge: 1,
      badgeColor: COLORS.textMuted,
    };
  }
  if (normalized.includes('техническ')) {
    return {
      avatar: 'Т',
      isWarrior: false,
      lastMsgAuthor: '',
      lastMsgText: 'Расписание практик · ссылки Zoom — в закрепе',
      time: '08:15',
      badge: 0,
      badgeColor: '',
      practice: 'идёт Гудение до 15:40',
    };
  }
  if (normalized.includes('общени')) {
    return {
      avatar: 'С',
      isWarrior: false,
      lastMsgAuthor: 'Сергей Д.:',
      lastMsgText: 'Благодарю за сегодняшний Сатсанг 🙏',
      time: 'вчера',
      badge: 0,
      badgeColor: '',
    };
  }
  return {
    avatar: (name || 'C')[0].toUpperCase(),
    isWarrior: false,
    lastMsgAuthor: '',
    lastMsgText: 'Открыть переписку',
    time: 'пн',
    badge: 0,
    badgeColor: '',
  };
};

export default function ChatListScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('Основные');

  const { data: chats, isLoading, error, refetch } = useQuery({
    queryKey: ['chats'],
    queryFn: api.messaging.listChats,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.amber} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Ошибка: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Сводка состояния */}
      <View style={styles.summaryContainer}>
        <View style={styles.statChip}>
          <Text style={[styles.statNum, styles.amberText]}>3</Text>
          <Text style={styles.statLabel}>неизученных{'\n'}отчёта</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={[styles.statNum, styles.amberText]}>5</Text>
          <Text style={styles.statLabel}>новых{'\n'}корректировок</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statNum}>2</Text>
          <Text style={styles.statLabel}>материала{'\n'}в Навигаторе</Text>
        </View>
      </View>

      {/* Плашка сатсанга */}
      <View style={styles.banner}>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerEyebrow}>Сатсанг назначен</Text>
          <Text style={styles.bannerTitle}>Сегодня в 20:00</Text>
        </View>
        <TouchableOpacity style={styles.bannerButton}>
          <Text style={styles.bannerButtonText}>Войти</Text>
        </TouchableOpacity>
      </View>

      {/* Вкладки разделов */}
      <View style={styles.gtabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gtabsScroll}
        >
          {['Мастер', 'Основные', 'Воины', 'Команда', 'Ретрит'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.gtab, activeTab === tab && styles.gtabActive]}
            >
              <Text style={[
                styles.gtabText, 
                activeTab === tab && styles.gtabTextActive,
                activeTab === tab && tab === 'Основные' && { color: COLORS.amber }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          const deco = getChatDecoration(item.name || 'Personal');
          return (
            <TouchableOpacity 
              style={styles.chatRow}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
            >
              <View style={[styles.avatar, deco.isWarrior && styles.avatarWarrior]}>
                <Text style={[styles.avatarText, deco.isWarrior && styles.avatarTextWarrior]}>
                  {deco.avatar}
                </Text>
              </View>
              
              <View style={styles.chatBody}>
                <View style={styles.chatTop}>
                  <Text style={[styles.chatName, deco.badge > 0 && styles.chatNameUnread]}>
                    {item.name || 'Личный чат'}
                  </Text>
                  <Text style={styles.chatTime}>{deco.time}</Text>
                </View>
                
                <Text 
                  style={[styles.chatPreview, deco.badge > 0 && styles.chatPreviewUnread]} 
                  numberOfLines={1}
                >
                  {deco.lastMsgAuthor && (
                    <Text style={[
                      styles.previewAuthor, 
                      deco.isWarrior && { color: COLORS.amberSoft }
                    ]}>
                      {deco.lastMsgAuthor}{' '}
                    </Text>
                  )}
                  {deco.lastMsgText}
                </Text>

                {deco.practice && (
                  <View style={styles.practiceContainer}>
                    <View style={styles.practiceDot} />
                    <Text style={styles.practiceText}>{deco.practice}</Text>
                  </View>
                )}
              </View>

              {deco.badge > 0 && (
                <View style={[
                  styles.badgeContainer, 
                  deco.badgeColor === COLORS.amber && styles.badgeAmber
                ]}>
                  <Text style={styles.badgeText}>{deco.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Нет активных чатов</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statChip: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 4,
    minHeight: 80,
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 22,
    color: COLORS.textPrimary,
    fontFamily: FONTS.displaySemiBold,
    marginBottom: 4,
  },
  amberText: {
    color: COLORS.amber,
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  banner: {
    backgroundColor: COLORS.amberTint,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerEyebrow: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.amber,
    fontFamily: FONTS.mono,
  },
  bannerTitle: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontFamily: FONTS.displaySemiBold,
    marginTop: 3,
  },
  bannerButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  gtabsContainer: {
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gtabsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  gtab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gtabActive: {
    borderBottomColor: COLORS.amber,
  },
  gtabText: {
    fontSize: 14.5,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  gtabTextActive: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  chatRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarWarrior: {
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberGlow,
  },
  avatarText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.bodyMedium,
  },
  avatarTextWarrior: {
    color: COLORS.amber,
    fontFamily: FONTS.bodySemiBold,
  },
  chatBody: {
    flex: 1,
    marginRight: 8,
  },
  chatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15.5,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  chatNameUnread: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  chatTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
  },
  chatPreview: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
  },
  chatPreviewUnread: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  previewAuthor: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  practiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  practiceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amberBright,
    marginRight: 6,
  },
  practiceText: {
    fontSize: 11,
    color: COLORS.amberSoft,
    fontFamily: FONTS.body,
  },
  badgeContainer: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeAmber: {
    backgroundColor: COLORS.amber,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: FONTS.monoMedium,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.warn,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: FONTS.body,
  },
  retryButton: {
    backgroundColor: COLORS.amber,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
  },
});
