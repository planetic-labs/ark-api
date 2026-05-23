import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { api } from '../../services/api';
import { COLORS, FONTS } from '../../constants/Config';
import { useWebSocket } from '../../hooks/useWebSocket';

interface UserDeco {
  name: string;
  avatar: string;
  role: string;
  isWarrior: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { lastMessage } = useWebSocket();
  const router = useRouter();

  // Local interactive states to wow the user (Premium feel)
  const [studiedReports, setStudiedReports] = useState<Record<string, boolean>>({});
  const [messageReactions, setMessageReactions] = useState<Record<string, { pray: number; eye: number; userPrayed: boolean; userEyed: boolean }>>({});

  const toggleReaction = (messageId: string, type: 'pray' | 'eye') => {
    setMessageReactions(prev => {
      const current = prev[messageId] || { pray: 4, eye: 2, userPrayed: false, userEyed: false };
      if (type === 'pray') {
        const userPrayed = !current.userPrayed;
        return {
          ...prev,
          [messageId]: {
            ...current,
            userPrayed,
            pray: current.pray + (userPrayed ? 1 : -1)
          }
        };
      } else {
        const userEyed = !current.userEyed;
        return {
          ...prev,
          [messageId]: {
            ...current,
            userEyed,
            eye: current.eye + (userEyed ? 1 : -1)
          }
        };
      }
    });
  };

  // Listen for real-time messages
  useEffect(() => {
    if (lastMessage?.type === 'message.new' && lastMessage.data.chat_id === id) {
      queryClient.setQueryData(['messages', id], (oldData: any) => {
        if (!oldData) return [lastMessage.data];
        if (oldData.find((m: any) => m.id === lastMessage.data.id)) return oldData;
        return [lastMessage.data, ...oldData];
      });
    }
  }, [lastMessage, id]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.messaging.getMessages(id as string),
    enabled: !!id && id !== 'undefined',
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.listAll,
  });

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: api.messaging.listChats,
  });

  const currentChat = chats?.find(c => c.id === id);

  const mutation = useMutation({
    mutationFn: () => api.messaging.sendMessage(id as string, content),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  const handleSend = () => {
    if (!content.trim() || mutation.isPending) return;
    mutation.mutate();
  };

  const getSenderDeco = (senderId: string): UserDeco => {
    const sender = users?.find(u => u.id === senderId);
    if (!sender) {
      return {
        name: 'Пользователь',
        avatar: '?',
        role: 'STUDENT',
        isWarrior: false
      };
    }
    const isWarrior = sender.role === 'WARRIOR' || sender.role === 'MASTER' || sender.role === 'ADMIN';
    return {
      name: sender.full_name || sender.email.split('@')[0],
      avatar: (sender.full_name || sender.email)[0].toUpperCase(),
      role: sender.role,
      isWarrior
    };
  };

  // Helper to detect if a message content looks like a report
  const isReportFormat = (text: string) => {
    return (
      text.toLowerCase().startsWith('отчёт') || 
      text.toLowerCase().startsWith('отчет') ||
      text.includes('1.') || 
      text.includes('2.')
    );
  };

  // Parse items from report
  const parseReportItems = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    // Find lines that start with number
    const items = lines.map(line => {
      const match = line.match(/^(\d+[\.\)])\s*(.*)/);
      if (match) {
        return { num: match[1], text: match[2] };
      }
      return { num: '•', text: line };
    });
    return items.length > 0 ? items : [{ num: '•', text }];
  };

  const renderMessageItem = (item: any, index: number) => {
    const sender = getSenderDeco(item.sender_id);
    const contentText = item.content || '';
    const formattedTime = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Screenshot warning simulation / check
    if (contentText.includes('скриншот') || contentText.includes('сделал скриншот')) {
      return (
        <View style={styles.sysMsgWarnContainer}>
          <Text style={styles.sysMsgWarnText}>⚠ {contentText}</Text>
        </View>
      );
    }

    // 2. Report Card view
    if (isReportFormat(contentText)) {
      const reportItems = parseReportItems(contentText);
      const isStudied = studiedReports[item.id] || false;
      const currentReact = messageReactions[item.id] || { pray: 4, eye: 2, userPrayed: false, userEyed: false };

      return (
        <View style={styles.msgRow}>
          <View style={[styles.avatarSm, sender.isWarrior && styles.avatarSmWarrior]}>
            <Text style={[styles.avatarSmText, sender.isWarrior && styles.avatarSmTextWarrior]}>
              {sender.avatar}
            </Text>
          </View>
          <View style={styles.reportCard}>
            <View style={styles.reportHead}>
              <View>
                <Text style={styles.reportTag}>Отчёт</Text>
                <Text style={styles.reportName}>{sender.name}</Text>
              </View>
              <Text style={styles.reportDate}>
                {new Date(item.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} · {formattedTime}
              </Text>
            </View>
            <View style={styles.reportBody}>
              {reportItems.map((ri, idx) => (
                <View key={idx} style={styles.reportItem}>
                  <Text style={styles.reportItemNum}>{ri.num}</Text>
                  <Text style={styles.reportItemText}>{ri.text}</Text>
                </View>
              ))}
            </View>
            <View style={styles.reportFoot}>
              <View style={styles.studiedRow}>
                <TouchableOpacity 
                  style={[styles.btnStudy, isStudied && styles.btnStudyDone]}
                  onPress={() => setStudiedReports(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                >
                  <Text style={[styles.btnStudyText, isStudied && styles.btnStudyTextDone]}>
                    {isStudied ? '✓ Изучен' : 'Изучить'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.studiedStat}>
                  изучили {isStudied ? 19 : 18} · <Text style={styles.warriorMarkText}>◈ {isStudied ? 3 : 2}</Text>
                </Text>
              </View>
              <View style={styles.reactRow}>
                <Text style={styles.reactDivider}>реакции</Text>
                <TouchableOpacity 
                  style={[styles.reactChip, currentReact.userPrayed && styles.reactChipMine]}
                  onPress={() => toggleReaction(item.id, 'pray')}
                >
                  <Text style={[styles.reactChipText, currentReact.userPrayed && styles.reactChipTextMine]}>
                    🙏 {currentReact.pray}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.reactChip, currentReact.userEyed && styles.reactChipMine]}
                  onPress={() => toggleReaction(item.id, 'eye')}
                >
                  <Text style={[styles.reactChipText, currentReact.userEyed && styles.reactChipTextMine]}>
                    👁 {currentReact.eye}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reactChipAdd}>
                  <Text style={styles.reactChipAddText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // 3. Correction / Thread nested message view
    const isCorrection = sender.isWarrior && index > 0 && isReportFormat(messages[index - 1]?.content || '');

    if (isCorrection) {
      return (
        <View style={styles.correctionContainer}>
          <Text style={styles.correctionTag}>◈ Корректировка · тред летописи</Text>
          <View style={[styles.msgRow, { marginHorizontal: 0, marginBottom: 0 }]}>
            <View style={[styles.avatarSm, styles.avatarSmWarrior]}>
              <Text style={[styles.avatarSmText, styles.avatarSmTextWarrior]}>{sender.avatar}</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleWarrior]}>
              <Text style={[styles.authorName, { color: COLORS.amberSoft, fontFamily: FONTS.display, fontStyle: 'italic' }]}>
                {sender.name}
              </Text>
              <Text style={styles.messageText}>{contentText}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.timeText}>{formattedTime}</Text>
                <Text style={styles.readText}>✓ прочитано 24</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // 4. Regular message view (warrior / student)
    return (
      <View style={styles.msgRow}>
        <View style={[styles.avatarSm, sender.isWarrior && styles.avatarSmWarrior]}>
          <Text style={[styles.avatarSmText, sender.isWarrior && styles.avatarSmTextWarrior]}>
            {sender.avatar}
          </Text>
        </View>
        <View style={[styles.bubble, sender.isWarrior && styles.bubbleWarrior]}>
          <Text style={[styles.authorName, sender.isWarrior && { color: COLORS.amberSoft, fontFamily: FONTS.display, fontStyle: 'italic' }]}>
            {sender.name} {sender.isWarrior && '◈'}
          </Text>
          <Text style={styles.messageText}>{contentText}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{formattedTime}</Text>
            <Text style={styles.readText}>✓✓</Text>
          </View>
        </View>
      </View>
    );
  };

  const bottomPadding = isKeyboardVisible
    ? 10
    : Math.max(insets.bottom, Platform.OS === 'android' ? 15 : 0);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {currentChat?.name || 'Диалог'}
              </Text>
              <Text style={styles.headerSubText}>
                32 участника · <Text style={{ color: COLORS.amber }}>◈ 3 Воина</Text>
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.headerActionBtn}>
                <Text style={styles.headerActionIcon}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn}>
                <Text style={styles.headerActionIcon}>⋮</Text>
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        {messagesLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.amber} />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => renderMessageItem(item, index)}
            ListHeaderComponent={() => (
              <View style={styles.sysDateContainer}>
                <Text style={styles.sysDateText}>Сегодня</Text>
              </View>
            )}
          />
        )}

        <View style={[
          styles.composer,
          { paddingBottom: bottomPadding, paddingTop: 10 }
        ]}>
          <TouchableOpacity style={styles.composerIconBtn}>
            <Text style={styles.composerIcon}>+</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.composerInput}
            value={content}
            onChangeText={setContent}
            placeholder="Сообщение или отчёт…"
            placeholderTextColor={COLORS.textFaint}
            multiline
          />
          
          <TouchableOpacity
            style={[styles.composerIconBtn, content.trim().length > 0 && styles.sendBtnActive]}
            onPress={handleSend}
            disabled={mutation.isPending || content.trim().length === 0}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={COLORS.amber} size="small" />
            ) : content.trim().length > 0 ? (
              <Text style={styles.sendIconText}>➔</Text>
            ) : (
              <Text style={styles.composerIcon}>🎤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  backButton: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  titleContainer: {
    marginLeft: Platform.OS === 'ios' ? 0 : 8,
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.displaySemiBold,
  },
  headerSubText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    marginTop: 1.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  headerActionIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  sysDateContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  sysDateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sysMsgWarnContainer: {
    backgroundColor: 'rgba(183, 136, 69, 0.05)',
    borderWidth: 1,
    borderColor: '#F4EAD4',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginVertical: 8,
    alignSelf: 'center',
  },
  sysMsgWarnText: {
    fontSize: 12,
    color: COLORS.warn,
    fontFamily: FONTS.body,
  },
  msgRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 6,
    alignItems: 'flex-start',
  },
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#ECE7DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarSmWarrior: {
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberGlow,
  },
  avatarSmText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  avatarSmTextWarrior: {
    color: COLORS.amber,
    fontFamily: FONTS.bodySemiBold,
  },
  bubble: {
    backgroundColor: '#FCFAF5',
    borderWidth: 1,
    borderColor: '#F4F1EA',
    padding: 12,
    borderRadius: 15,
    borderTopLeftRadius: 4,
    maxWidth: '85%',
    flex: 1,
  },
  bubbleWarrior: {
    backgroundColor: 'rgba(252, 244, 227, 0.7)',
    borderColor: '#F0DFB8',
  },
  authorName: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
  },
  readText: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    marginLeft: 6,
  },
  reportCard: {
    borderWidth: 1,
    borderColor: '#ECE7DD',
    borderRadius: 15,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#282114',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  reportHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DD',
    backgroundColor: '#FCFAF5',
  },
  reportTag: {
    fontSize: 9,
    fontFamily: FONTS.monoMedium,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  reportName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontFamily: FONTS.displaySemiBold,
  },
  reportDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    alignSelf: 'flex-start',
  },
  reportBody: {
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  reportItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  reportItemNum: {
    fontSize: 11,
    color: COLORS.amber,
    marginRight: 6,
    width: 14,
    fontFamily: FONTS.monoMedium,
    paddingTop: 1,
  },
  reportItemText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
    flex: 1,
  },
  reportFoot: {
    borderTopWidth: 1,
    borderTopColor: '#F4F1EA',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  studiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnStudy: {
    borderWidth: 1.4,
    borderColor: COLORS.amber,
    backgroundColor: 'transparent',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 5,
    marginRight: 10,
  },
  btnStudyDone: {
    backgroundColor: COLORS.amber,
  },
  btnStudyText: {
    color: COLORS.amber,
    fontSize: 11.5,
    fontFamily: FONTS.bodySemiBold,
  },
  btnStudyTextDone: {
    color: '#ffffff',
  },
  studiedStat: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
  },
  warriorMarkText: {
    color: COLORS.amber,
    fontFamily: FONTS.bodySemiBold,
  },
  reactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F4F1EA',
    paddingTop: 8,
    marginTop: 4,
  },
  reactDivider: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  reactChip: {
    backgroundColor: '#F4F1EA',
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  reactChipMine: {
    backgroundColor: '#FAF1DC',
    borderWidth: 1,
    borderColor: '#F0DFB8',
  },
  reactChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
  },
  reactChipTextMine: {
    color: COLORS.amber,
    fontFamily: FONTS.monoMedium,
  },
  reactChipAdd: {
    width: 24,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ECE7DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactChipAddText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 13,
  },
  correctionContainer: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amberBright,
    paddingLeft: 13,
    marginLeft: 23,
    marginVertical: 8,
  },
  correctionTag: {
    fontSize: 9,
    fontFamily: FONTS.mono,
    color: COLORS.amber,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  composer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ECE7DD',
  },
  composerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECE7DD',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
    backgroundColor: '#FCFAF5',
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontFamily: FONTS.body,
  },
  sendBtnActive: {
    backgroundColor: COLORS.amber,
  },
  sendIconText: {
    fontSize: 16,
    color: '#ffffff',
  },
});