// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../components/Card'; 

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 

  const handleLogin = async () => {
    setError('');
    setLoading(true); 

    if (email === '' || password === '') {
      setError('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // NÃO PRECISA NAVEGAR MANUALMENTE (navigation.navigate)
      // O AuthContext detectará a mudança e o RootNavigator carregará o AppStack.
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      
      let msg = 'Erro ao tentar logar.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email' || err.code === 'auth/invalid-credential') {
        msg = 'Credenciais inválidas. Verifique e-mail e senha.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Senha incorreta.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas falhas. Tente novamente mais tarde.';
      }
      setError(msg);
      Alert.alert('Erro de Login', msg);
    }
    // Nota: Se der sucesso, o componente será desmontado, então não precisamos setar loading(false) no sucesso.
  };

  return (
    <KeyboardAvoidingView 
        style={styles.fullContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <ScrollView contentContainerStyle={styles.centeredContent}>
            
            <Card style={styles.loginCard}>
                <Text style={styles.header}>
                    <MaterialCommunityIcons name="greenhouse" size={32} color="#166534" /> 
                    {'\n'}SGE - Entrar
                </Text>
                
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                    placeholder="seu@email.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                />
                
                <Text style={styles.label}>Senha</Text>
                <TextInput
                    placeholder="Sua senha"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                />
                
                {error ? (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#D32F2F" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
                
                <TouchableOpacity 
                    style={styles.loginButton} 
                    onPress={handleLogin} 
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.loginButtonText}>ENTRAR</Text>
                    )}
                </TouchableOpacity>

            </Card>

            <TouchableOpacity
                style={styles.registerButton}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.registerButtonText}>
                    Não tem conta? <Text style={styles.registerLink}>Crie uma agora!</Text>
                </Text>
            </TouchableOpacity>

        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#F1F5F9', 
    },
    centeredContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
        padding: 25,
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#1E293B',
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        fontWeight: '600',
        color: '#475569',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 14, 
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: '#F8FAFC',
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        backgroundColor: '#166534', // Verde Floresta
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        height: 56,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    registerButton: {
        marginTop: 10,
        padding: 10,
    },
    registerButtonText: {
        fontSize: 14,
        color: '#64748B',
    },
    registerLink: {
        color: '#166534',
        fontWeight: 'bold',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#B91C1C',
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    }
});

export default LoginScreen;