import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '@/constants/colors';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  // Using text characters since we don't have @expo/vector-icons installed
  // Replace with Ionicons once you run: npx expo install @expo/vector-icons
  return null; // icon is shown via tabBarLabel only for now
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 82 : 60,
        },
        tabBarActiveTintColor: Colors.red,
        tabBarInactiveTintColor: Colors.dim,
        tabBarLabelStyle: {
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Trade' }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: 'Team' }}
      />
      <Tabs.Screen
        name="startsit"
        options={{ title: 'Start/Sit' }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account' }}
      />
    </Tabs>
  );
}
