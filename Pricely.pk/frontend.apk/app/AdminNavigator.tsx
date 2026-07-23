import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminTabs from './AdminTabs';
import ManageTeamAccessScreen from './ManageTeamAccessScreen';
import InviteMemberScreen from './InviteMemberScreen';
import ActiveSessionsScreen from './ActiveSessionsScreen';
import ReportsScreen from './ReportsScreen';
import StoreListingsScreen from './StoreListingsScreen';
import ActivityLogScreen from './ActivityLogScreen';
import AllProductsScreen from './AllProductsScreen';
import AllAlertsScreen from './AllAlertsScreen';

// AdminTabs (the 4 bottom-tab screens) is the home route here. Every
// "drill-in" detail screen that isn't itself a tab gets pushed on top of
// it as a sibling stack route with a back button.
export type AdminStackParamList = {
  AdminTabs: undefined;
  ManageTeamAccess: undefined;
  InviteMember: undefined;
  ActiveSessions: undefined;
  Reports: undefined;
  StoreListings: { store: string };
  ActivityLog: undefined;
  AllProducts: undefined;
  AllAlerts: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="ManageTeamAccess" component={ManageTeamAccessScreen} />
      <Stack.Screen name="InviteMember" component={InviteMemberScreen} />
      <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="StoreListings" component={StoreListingsScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <Stack.Screen name="AllProducts" component={AllProductsScreen} />
      <Stack.Screen name="AllAlerts" component={AllAlertsScreen} />
    </Stack.Navigator>
  );
}
