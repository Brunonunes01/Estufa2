// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // A navegação acontece automaticamente pelo AuthContext
    } catch (error: any) {
      Alert.alert('Falha no Login', error.message || 'Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* LOGO E TÍTULO */}
        <View style={styles.header}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="greenhouse" size={48} color="#166534" />
            </View>
            <Text style={styles.title}>Estufa Pro</Text>
            <Text style={styles.subtitle}>Gestão Inteligente</Text>
        </View>

        {/* FORMULÁRIO */}
        <View style={styles.formContainer}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="exemplo@email.com"
                    placeholderTextColor="#94A3B8" // COR DO PLACEHOLDER FIXA
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Sua senha secreta"
                    placeholderTextColor="#94A3B8" // COR DO PLACEHOLDER FIXA
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.loginBtnText}>Entrar</Text>
                )}
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Ainda não tem conta?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}>Criar conta grátis</Text>
                </TouchableOpacity>
            </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14532d', // Fundo Verde Escuro (Igual ao tema do App)
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    backgroundColor: '#FFF',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#A7F3D0',
    marginTop: 5,
  },

  // Form Styles
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // Cinza bem claro no fundo do input
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#1E293B', // COR DO TEXTO (Cinza Escuro quase preto)
    fontSize: 16,
    fontWeight: '500',
    height: '100%', // Garante que ocupa a altura toda
  },

  // Button Styles
  loginBtn: {
    backgroundColor: '#166534',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 5,
  },
  footerText: {
    color: '#64748B',
  },
  registerLink: {
    color: '#166534',
    fontWeight: 'bold',
  },
});

export default LoginScreen;