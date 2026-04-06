import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const Route = createRoute('/_404', {
  component: NotFoundPage,
  screenOptions: { headerShown: false },
});

function NotFoundPage() {
  const navigation = Route.useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>☁️</Text>
      <Text style={styles.title}>페이지를 찾을 수 없어요</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('/')}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>홈으로 돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#FAFAFA',
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 16,
    color: '#8B95A1',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
