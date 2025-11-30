import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Shield } from 'lucide-react-native';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield color="#b39272" size={64} />
        <Text style={styles.title}>BirchVault</Text>
        <Text style={styles.subtitle}>
          Your passwords, your control. Secure and encrypted.
        </Text>
      </View>

      <View style={styles.actions}>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1612',
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f3efe8',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#a68063',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  actions: {
    gap: 12,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#b39272',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1a1612',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#5c483c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#f3efe8',
    fontSize: 16,
    fontWeight: '600',
  },
});







