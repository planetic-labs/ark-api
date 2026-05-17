import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { api } from '../../services/api';
import { COLORS } from '../../constants/Config';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { lastMessage } = useWebSocket();

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

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.messaging.getMessages(id as string),
    enabled: !!id && id !== 'undefined',
  });

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

  const bottomPadding = isKeyboardVisible 
    ? 10 
    : Math.max(insets.bottom, Platform.OS === 'android' ? 15 : 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Chat', headerShown: true }} />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>{item.content}</Text>
              <Text style={styles.messageTime}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        />

        <View style={[
          styles.inputContainer, 
          { paddingBottom: bottomPadding, paddingTop: 10 }
        ]}>
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSend} 
            disabled={mutation.isPending}
          >
            <Text style={[styles.sendButtonText, mutation.isPending && { opacity: 0.5 }]}>
              {mutation.isPending ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  messageBubble: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.secondaryText,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    backgroundColor: '#F0F0F0',
    color: '#000',
    fontSize: 16,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    minWidth: 60,
  },
  sendButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
