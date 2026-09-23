import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import ResourcesScreen from '../screens/resources/ResourcesScreen';
import OptimizationScreen from '../screens/optimization/OptimizationScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const { canViewModule, hasAppAccess, canAccessResources } = useAuth();

  // Hai phân hệ này nằm sau LỚP QUYỀN KHÁC với `appPermissions`: server chặn
  // chúng bằng `authorizeApp`, dựa trên `User.appAdmins`. Web ẩn chúng theo đúng
  // quy tắc này (`Sidebar.jsx`), mobile thì trước đây không — nên cùng một tài
  // khoản thấy hai thứ khác nhau trên hai thiết bị, và bấm vào thì nhận 403.
  const canOptimize = hasAppAccess('optimize');
  const canSeeResources = canAccessResources();

  // Tổng quan không bao giờ bị ẩn: phải còn một chỗ để đứng khi mọi phân hệ khác
  // đều bị cấm, nếu không người dùng mở app ra là thấy thanh tab trống.

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBg,
          borderTopColor: theme.colors.tabBarBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={20} color={color} />
          ),
        }}
      />

      {canViewModule('projects') && (
        <Tab.Screen
          name="ProjectsTab"
          component={ProjectsScreen}
          options={{
            tabBarLabel: 'Dự án',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="folder-outline" size={20} color={color} />
            ),
          }}
        />
      )}

      {canViewModule('tasks') && (
        <Tab.Screen
          name="TasksTab"
          component={TasksScreen}
          options={{
            tabBarLabel: 'Công việc',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" size={20} color={color} />
            ),
          }}
        />
      )}

      {canSeeResources && (
        <Tab.Screen
          name="ResourcesTab"
          component={ResourcesScreen}
          options={{
            tabBarLabel: 'Nhân sự',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={20} color={color} />
            ),
          }}
        />
      )}

      {canOptimize && canViewModule('optimization') && (
        <Tab.Screen
          name="OptimizationTab"
          component={OptimizationScreen}
          options={{
            tabBarLabel: 'Tối ưu hóa',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="dna" size={20} color={color} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
