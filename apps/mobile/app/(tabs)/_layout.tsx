import { Tabs } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { COLORS } from '../../constants/Config';
import { useAuthStore } from '../../stores/useAuthStore';

export default function TabsLayout() {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    console.log("Logout triggered from UI");
    logout();
  };

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: COLORS.primary,
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleLogout} 
          style={{ marginRight: 15, padding: 5 }}
        >
          <Text style={{ color: COLORS.error, fontWeight: '600' }}>Logout</Text>
        </TouchableOpacity>
      )
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Chats',
          headerShown: true,
        }} 
      />
      <Tabs.Screen 
        name="users" 
        options={{ 
          title: 'Users',
          headerShown: true,
        }} 
      />
    </Tabs>
  );
}
