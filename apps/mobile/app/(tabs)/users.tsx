import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { COLORS } from '../../constants/Config';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';

export default function UsersScreen() {
  const currentUser = useAuthStore((state) => state.user);
  
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.listAll,
  });

  const mutation = useMutation({
    mutationFn: (userId: string) => api.messaging.createChat(userId),
    onSuccess: (chat) => {
      router.push({ pathname: '/chat/[id]', params: { id: chat.id } });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    }
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Filter out current user from the list
  const otherUsers = users?.filter(u => u.id !== currentUser?.id) || [];

  return (
    <View style={styles.container}>
      <FlatList
        data={otherUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userItem}
            onPress={() => mutation.mutate(item.id)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.full_name || item.email)[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.full_name || 'No Name'}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No other users found</Text>
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
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondaryText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: COLORS.secondaryText,
  },
});
