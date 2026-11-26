import React, { createContext, useContext, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { colors } from './src/theme.js';
import * as I from './src/components/Icons.js';
import CueMark from './src/components/CueMark.js';
import { ContentProvider } from './src/lib/content.js';
import { CueChatProvider } from './src/lib/cueChat.js';
import { useUserPrefs } from './src/lib/userPrefs.js';
import { navigationRef } from './src/lib/navigationRef.js';
import HomeScreen from './src/screens/HomeScreen.js';
import DiscoverScreen from './src/screens/DiscoverScreen.js';
import CueScreen from './src/screens/CueScreen.js';
import CueAnswerScreen from './src/screens/CueAnswerScreen.js';
import ProfileScreen from './src/screens/ProfileScreen.js';
import SearchScreen from './src/screens/SearchScreen.js';
import SearchAssistScreen from './src/screens/SearchAssistScreen.js';
import RecordScreen from './src/screens/RecordScreen.js';
import SavedScreen from './src/screens/SavedScreen.js';
import AccountScreen, { ConfirmSignOutScreen } from './src/screens/AccountScreen.js';
import SourceScreen from './src/screens/SourceScreen.js';
import Onboarding, { useNeedsOnboarding } from './src/components/Onboarding.js';
import Splash from './src/components/Splash.js';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PrefsContext = createContext(null);
export const usePrefs = () => useContext(PrefsContext);

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.screen,
    card: colors.screen,
    text: colors.text,
    border: colors.divider,
    primary: colors.crimson,
  },
};

function HomeStack({ prefs }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home">{(props) => <HomeScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="SearchAssist" component={SearchAssistScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Record">{(props) => <RecordScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Saved">{(props) => <SavedScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Source" component={SourceScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function DiscoverStack({ prefs }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Discover">{(props) => <DiscoverScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="SearchAssist" component={SearchAssistScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Record">{(props) => <RecordScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Source" component={SourceScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function CueStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Cue" component={CueScreen} />
      <Stack.Screen name="CueAnswer" component={CueAnswerScreen} />
      <Stack.Screen name="Source" component={SourceScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function ProfileStack({ prefs }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Profile">{(props) => <ProfileScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Saved">{(props) => <SavedScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="ConfirmSignOut" component={ConfirmSignOutScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="Record">{(props) => <RecordScreen {...props} prefs={prefs} />}</Stack.Screen>
      <Stack.Screen name="Source" component={SourceScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function Tabs({ prefs }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.canvas, borderTopColor: colors.divider },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.dim,
      }}
    >
      <Tab.Screen name="HomeTab" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <I.Home size={22} color={color} sw={focused ? 1.9 : 1.6} /> }}>
        {(props) => <HomeStack {...props} prefs={prefs} />}
      </Tab.Screen>
      <Tab.Screen name="DiscoverTab" options={{ title: 'Discover', tabBarIcon: ({ color, focused }) => <I.Compass size={22} color={color} sw={focused ? 1.9 : 1.6} /> }}>
        {(props) => <DiscoverStack {...props} prefs={prefs} />}
      </Tab.Screen>
      <Tab.Screen name="CueTab" options={{ title: 'Cue', tabBarIcon: ({ color }) => <CueMark size={24} color={color === colors.text ? colors.crimson : colors.dim} /> }}>
        {() => <CueStack />}
      </Tab.Screen>
      <Tab.Screen name="ProfileTab" options={{ title: 'You', tabBarIcon: ({ color, focused }) => <I.User size={22} color={color} sw={focused ? 1.9 : 1.6} /> }}>
        {(props) => <ProfileStack {...props} prefs={prefs} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function Shell() {
  const prefs = useUserPrefs();
  const [needsOnboarding, markOnboarded] = useNeedsOnboarding();
  const [splash, setSplash] = useState(true);

  return (
    <PrefsContext.Provider value={prefs}>
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <Tabs prefs={prefs} />
        </NavigationContainer>
        {splash && <Splash onDone={() => setSplash(false)} />}
        {needsOnboarding && !splash && <Onboarding prefs={prefs} onDone={markOnboarded} />}
        <StatusBar style="light" />
      </View>
    </PrefsContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ContentProvider>
        <CueChatProvider>
          <Shell />
        </CueChatProvider>
      </ContentProvider>
    </SafeAreaProvider>
  );
}
