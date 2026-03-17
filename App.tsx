import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import CreateNoteScreen from './src/screens/CreateNoteScreen';
import { RootStackParamList } from './src/types/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationService } from './src/services/NotificationService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // Request permissions and setup Android channel
    NotificationService.registerForPushNotificationsAsync();
    
    // Add foreground/background listener when tapped
    const removeListener = NotificationService.setupNotificationListeners();
    
    return () => {
      removeListener();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1E1E1E',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#1E1E1E',
            }
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="CreateNote" 
            component={CreateNoteScreen} 
            options={{ title: 'Note Details', headerShadowVisible: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
