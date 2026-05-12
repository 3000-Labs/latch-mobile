import { Stack } from 'expo-router';

export default function MigrationLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
