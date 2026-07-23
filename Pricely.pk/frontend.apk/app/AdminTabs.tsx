import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AnimatedTabBar from '../components/AnimatedTabBar';
import AdminDashboardScreen from './AdminDashboardScreen';
import AdminDuplicatesScreen from './AdminDuplicatesScreen';
import AdminUsersScreen from './AdminUsersScreen';
import AdminSettingsScreen from './AdminSettingsScreen';
import { useAuthStore } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  const { user } = useAuthStore();
  // Read-only is scoped to "dashboard & reports only" — Duplicates and
  // Users aren't even reachable as tabs for that role. Admin and Support
  // both get the full 4-tab layout; what they can *do* inside each tab
  // is gated separately (Support can view but not merge/split/re-run/manage team).
  const isReadOnly = user?.role === 'readonly';

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <AnimatedTabBar {...props} />}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      {!isReadOnly && <Tab.Screen name="Duplicates" component={AdminDuplicatesScreen} />}
      {!isReadOnly && <Tab.Screen name="Users" component={AdminUsersScreen} />}
      <Tab.Screen name="Settings" component={AdminSettingsScreen} />
    </Tab.Navigator>
  );
}
