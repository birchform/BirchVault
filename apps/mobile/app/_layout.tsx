import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1612',
          },
          headerTintColor: '#f3efe8',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#1a1612',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Create Account' }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}







