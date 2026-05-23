import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { COLORS, FONTS } from '../constants/Config';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';
import { User, Chat } from '@ark/shared-types';

type RoleType = 'STUDENT' | 'WARRIOR' | 'MASTER' | 'ADMIN';

export default function UsersScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  
  // Modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<RoleType>('STUDENT');

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: api.users.listAll,
  });

  const chatMutation = useMutation<Chat, any, string>({
    mutationFn: (userId: string) => api.messaging.createChat(userId),
    onSuccess: (chat) => {
      router.push({ pathname: '/chat/[id]', params: { id: chat.id } });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    }
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: { email: string; full_name?: string; role: RoleType }) => 
      api.users.create(userData),
    onSuccess: () => {
      Alert.alert('Success', 'User created successfully');
      setModalVisible(false);
      setEmail('');
      setFullName('');
      setRole('STUDENT');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    }
  });

  const handleCreateUser = () => {
    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    createUserMutation.mutate({
      email,
      full_name: fullName || undefined,
      role,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.amber} />
      </View>
    );
  }

  // Filter out current user from the list
  const otherUsers = users?.filter(u => u.id !== currentUser?.id) || [];
  const isAdmin = currentUser?.role === 'ADMIN';

  const isWarriorRole = (userRole?: string) => {
    return userRole === 'WARRIOR' || userRole === 'MASTER' || userRole === 'ADMIN';
  };

  const getRoleDisplayName = (r: string) => {
    switch (r) {
      case 'ADMIN': return 'Админ';
      case 'MASTER': return 'Мастер';
      case 'WARRIOR': return 'Воин';
      default: return 'Ученик';
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={otherUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isWarrior = isWarriorRole(item.role);
          return (
            <TouchableOpacity 
              style={styles.userItem}
              onPress={() => chatMutation.mutate(item.id)}
            >
              <View style={[styles.avatar, isWarrior && styles.avatarWarrior]}>
                <Text style={[styles.avatarText, isWarrior && styles.avatarTextWarrior]}>
                  {(item.full_name || item.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>
                    {item.full_name || 'Без Имени'} {isWarrior && '◈'}
                  </Text>
                  {item.role && (
                    <View style={[
                      styles.roleBadge, 
                      isWarrior ? styles.warriorBadge : styles.studentBadge
                    ]}>
                      <Text style={[
                        styles.roleBadgeText, 
                        isWarrior ? styles.warriorBadgeText : styles.studentBadgeText
                      ]}>
                        {getRoleDisplayName(item.role)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Участники не найдены</Text>
        }
      />

      {isAdmin && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Новый участник</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Email адрес"
                placeholderTextColor={COLORS.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Имя и фамилия"
                placeholderTextColor={COLORS.textFaint}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <Text style={styles.roleLabel}>Роль участника</Text>
              <View style={styles.roleContainer}>
                {(['STUDENT', 'WARRIOR', 'MASTER', 'ADMIN'] as RoleType[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      role === r && styles.activeRoleChip
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[
                      styles.roleChipText,
                      role === r && styles.activeRoleChipText
                    ]}>
                      {getRoleDisplayName(r)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                  disabled={createUserMutation.isPending}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Создать</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  listContainer: {
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1EA',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#ECE7DD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarWarrior: {
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberGlow,
  },
  avatarText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
  },
  avatarTextWarrior: {
    color: COLORS.amber,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    color: COLORS.textPrimary,
    marginRight: 8,
    fontFamily: FONTS.displaySemiBold,
  },
  userEmail: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentBadge: {
    backgroundColor: '#F4F1EA',
    borderColor: '#ECE7DD',
  },
  warriorBadge: {
    backgroundColor: '#FCF4E3',
    borderColor: '#F0DFB8',
  },
  roleBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.monoMedium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  studentBadgeText: {
    color: COLORS.textSecondary,
  },
  warriorBadgeText: {
    color: COLORS.amber,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.amber,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#282114',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 30, 23, 0.42)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#282114',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontFamily: FONTS.displaySemiBold,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ECE7DD',
    backgroundColor: '#FCFAF5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
  },
  roleLabel: {
    fontSize: 11,
    fontFamily: FONTS.monoMedium,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
  },
  activeRoleChip: {
    borderColor: '#F0DFB8',
    backgroundColor: '#FAF1DC',
  },
  roleChipText: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  activeRoleChipText: {
    color: COLORS.amber,
    fontFamily: FONTS.bodySemiBold,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F4F1EA',
  },
  createButton: {
    backgroundColor: COLORS.amber,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
  },
});
