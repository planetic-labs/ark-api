import { Tabs, Redirect, router } from 'expo-router';
import { TouchableOpacity, Text, Platform, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS, FONTS } from '../../constants/Config';
import { useAuthStore } from '../../stores/useAuthStore';
import { api } from '../../services/api';

const ChatsIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Path
      d="M4 6.5C4 5.1 5.1 4 6.5 4h10C17.9 4 19 5.1 19 6.5v7c0 1.4-1.1 2.5-2.5 2.5H9l-4 3.5v-3.5H6.5C5.1 16 4 14.9 4 13.5v-7z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </Svg>
);

const NavigatorIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Circle cx={6} cy={6} r={2.2} stroke={color} strokeWidth={1.7} />
    <Circle cx={17} cy={11.5} r={2.2} stroke={color} strokeWidth={1.7} />
    <Circle cx={7.5} cy={17.5} r={2.2} stroke={color} strokeWidth={1.7} />
    <Path d="M7.7 7.5l7.6 2.8M15.4 13.4l-6.3 3" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const VideoIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Rect x={3.5} y={5} width={16} height={13} rx={2.6} stroke={color} strokeWidth={1.7} />
    <Path d="M10 9.3l4 2.2-4 2.2V9.3z" fill={color} />
  </Svg>
);

const MaterialsIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Path d="M11.5 3.5l7.5 4-7.5 4-7.5-4 7.5-4z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M4.5 11.5l7 3.7 7-3.7M4.5 15l7 3.7 7-3.7" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
  </Svg>
);

const ChroniclesIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 23 23" fill="none">
    <Path d="M6 4h8l4 4v11H6V4z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M8.5 9.5h6M8.5 12.5h6M8.5 15.5h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const insets = useSafeAreaInsets();

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  const handleLogout = async () => {
    console.log("Logout triggered from UI");
    try {
      await api.auth.logout();
    } catch (e) {
      console.log("Failed to logout on server", e);
    }
    logout();
  };

  const hasBottomInset = insets.bottom > 0;
  const paddingBottom = hasBottomInset ? insets.bottom : (Platform.OS === 'ios' ? 24 : 12);
  const barHeight = (Platform.OS === 'ios' ? 52 : 56) + paddingBottom;

  return (
    <Tabs screenOptions={({ route }) => ({ 
      tabBarActiveTintColor: COLORS.amber,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarStyle: {
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        height: barHeight,
        paddingBottom: paddingBottom,
        paddingTop: 8,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarLabelStyle: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 11,
      },
      headerStyle: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTitleStyle: {
        fontFamily: FONTS.displaySemiBold,
        color: COLORS.textPrimary,
        fontSize: 18,
      },
      headerLeft: () => {
        const user = useAuthStore((state) => state.user);
        const name = user?.full_name || user?.email || 'A';
        const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                "Выход из системы",
                "Вы уверены, что хотите выйти?",
                [
                  { text: "Отмена", style: "cancel" },
                  { text: "Выйти", style: "destructive", onPress: handleLogout }
                ]
              );
            }} 
            style={{
              marginLeft: 15,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#DCD5C7',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: '#5F5848' }}>
              {initials}
            </Text>
          </TouchableOpacity>
        );
      },
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => router.push('/users')} 
          style={{ marginRight: 15, paddingHorizontal: 10, paddingVertical: 5 }}
        >
          <Svg width={20} height={20} viewBox="0 0 23 23" fill="none">
            <Circle cx={9} cy={7.5} r={3} stroke={COLORS.amber} strokeWidth={1.7} fill="none" />
            <Path
              d="M4 16c0-2.5 2-4.5 5-4.5s5 2 5 4.5"
              stroke={COLORS.amber}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx={15} cy={6.5} r={2.2} stroke={COLORS.amber} strokeWidth={1.7} fill="none" />
            <Path
              d="M12 14c0-1.8 1-3 3-3s3 1.2 3 3"
              stroke={COLORS.amber}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </TouchableOpacity>
      ),
      tabBarIcon: ({ color }) => {
        if (route.name === 'index') return <ChatsIcon color={color} />;
        if (route.name === 'navigator') return <NavigatorIcon color={color} />;
        if (route.name === 'video') return <VideoIcon color={color} />;
        if (route.name === 'materials') return <MaterialsIcon color={color} />;
        if (route.name === 'chronicles') return <ChroniclesIcon color={color} />;
        return null;
      }
    })}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Чаты',
          headerShown: true,
        }} 
      />
      <Tabs.Screen 
        name="navigator" 
        options={{ 
          title: 'Навигатор',
          headerShown: true,
        }} 
      />
      <Tabs.Screen 
        name="video" 
        options={{ 
          title: 'Видео',
          headerShown: true,
        }} 
      />
      <Tabs.Screen 
        name="materials" 
        options={{ 
          title: 'Материалы',
          headerShown: true,
        }} 
      />
      <Tabs.Screen 
        name="chronicles" 
        options={{ 
          title: 'Летописи',
          headerShown: true,
        }} 
      />
    </Tabs>
  );
}
