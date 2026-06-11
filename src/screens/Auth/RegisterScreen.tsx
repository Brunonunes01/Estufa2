import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/theme';
import useGoogleAuth from '../../hooks/useGoogleAuth';
import { signUpWithPasswordBridge } from '../../services/authBridge';

const { width } = Dimensions.get('window');

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, loadingGoogle, googleDisabled } = useGoogleAuth({
    onError: (message) => {
      setError(message);
      Alert.alert('Erro', message);
    },
  });

  const handleRegister = async () => {
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha nome, e-mail e senha.');
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithPasswordBridge(name.trim(), email.trim(), password);
      Alert.alert('Conta criada', 'Seu cadastro foi realizado com sucesso.');
      navigation.navigate('Login');
    } catch (err: any) {
      let message = 'Erro ao criar conta.';
      if (
        err?.code === 'auth/email-already-in-use' ||
        err?.message?.toLowerCase?.().includes('already registered')
      ) {
        message = 'Este e-mail já está em uso.';
      } else if (err?.code === 'auth/invalid-email') {
        message = 'Informe um e-mail válido.';
      } else if (typeof err?.message === 'string' && err.message.trim()) {
        message = err.message;
      }
      setError(message);
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoArea}>
            <Text style={styles.kicker}>Cadastro</Text>
            <Text style={styles.title}>
              AgroGestao <Text style={styles.titleLight}>Rural</Text>
            </Text>
            <Text style={styles.subtitle}>
              Crie sua conta para controlar estufas, plantios e vendas em um só lugar.
            </Text>
          </View>
        </View>

        <View style={styles.formArea}>
          <View style={styles.inputBox}>
            <View style={styles.iconBox}>
              <Feather name="user" size={18} color="#0F5A1C" />
            </View>
            <TextInput
              placeholder="Nome completo"
              placeholderTextColor="#777C82"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputBox}>
            <View style={styles.iconBox}>
              <Feather name="mail" size={18} color="#0F5A1C" />
            </View>
            <TextInput
              placeholder="E-mail"
              placeholderTextColor="#777C82"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputBox}>
            <View style={styles.iconBox}>
              <Feather name="lock" size={18} color="#0F5A1C" />
            </View>
            <TextInput
              placeholder="Mínimo de 6 caracteres"
              placeholderTextColor="#777C82"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#0F5A1C" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity activeOpacity={0.88} style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <>
                <Feather name="user-plus" size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Criar conta</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.googleButton, googleDisabled && { opacity: 0.55 }]}
            onPress={signInWithGoogle}
            disabled={loadingGoogle || googleDisabled}
          >
            {loadingGoogle ? (
              <ActivityIndicator color="#0F5A1C" />
            ) : (
              <>
                <Feather name="chrome" size={18} color="#0F5A1C" />
                <Text style={styles.googleButtonText}>Google indisponível nesta versão</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerArea}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity activeOpacity={0.88} style={styles.registerBox} onPress={() => navigation.navigate('Login')}>
            <View style={styles.userCircle}>
              <Feather name="log-in" size={18} color="#0F5A1C" />
            </View>
            <Text style={styles.registerText}>
              Já tem conta? <Text style={styles.registerLink}>Entrar</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    minHeight: '100%',
    backgroundColor: '#FFFFFF',
  },
  hero: {
    width: '100%',
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F4F8EF',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 24,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#4B6A53',
    marginBottom: 8,
  },
  title: {
    fontSize: width < 390 ? 26 : 29,
    fontWeight: '800',
    color: '#063F13',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  titleLight: {
    color: '#35901F',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#53605B',
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '400',
    maxWidth: 300,
  },
  formArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    marginTop: -12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  inputBox: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#B5CDAA',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F2F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#303030',
    paddingVertical: 0,
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  errorBox: {
    marginTop: -2,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#C93B3B',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    height: 52,
    backgroundColor: '#218119',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 10,
    marginTop: 6,
    shadowColor: '#1B6E14',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    height: 50,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D6C0',
    backgroundColor: '#F8FBF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 8,
  },
  googleButtonText: {
    color: '#0F5A1C',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    columnGap: 12,
  },
  dividerText: {
    fontSize: 13,
    color: '#7A8B7F',
    fontWeight: '600',
  },
  line: {
    height: 1,
    width: width < 390 ? 58 : 74,
    backgroundColor: '#C7D6C0',
  },
  registerBox: {
    minHeight: 58,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F4F8EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  userCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  registerText: {
    fontSize: 14,
    color: '#202020',
  },
  registerLink: {
    color: '#0F6B1D',
    fontWeight: '700',
  },
});

export default RegisterScreen;
