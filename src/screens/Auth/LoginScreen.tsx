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
  ScrollView
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Certifique-se que esse arquivo existe, senão remova a importação e troque <Card> por <View style={styles.loginCard}>
import Card from '../../components/Card'; 

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 

  const handleLogin = () => {
    setError('');
    setLoading(true); 

    if (email === '' || password === '') {
      setError('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }
    
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        setLoading(false);
        // A navegação ocorre automaticamente pelo AuthContext
      })
      .catch((err) => {
        setLoading(false);
        console.error(err); // Bom para debug
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email' || err.code === 'auth/invalid-credential') {
          setError('Credenciais inválidas. Verifique o e-mail e a senha.');
        } else if (err.code === 'auth/wrong-password') {
          setError('Senha incorreta. Tente novamente.');
        } else {
          setError('Erro ao tentar logar. Tente mais tarde.');
        }
      });
  };

  return (
    <KeyboardAvoidingView 
        style={styles.fullContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <ScrollView contentContainerStyle={styles.centeredContent}>
            
            <Card style={styles.loginCard}>
                <Text style={styles.header}>
                    <MaterialCommunityIcons name="greenhouse" size={28} color="#4CAF50" /> SGE - Entrar
                </Text>
                
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                    placeholder="exemplo@dominio.com"
                    placeholderTextColor="#94A3B8" // <--- ADICIONADO PARA SEGURANÇA VISUAL
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                />
                
                <Text style={styles.label}>Senha</Text>
                <TextInput
                    placeholder="Sua senha"
                    placeholderTextColor="#94A3B8" // <--- ADICIONADO PARA SEGURANÇA VISUAL
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
                        <Text style={styles.loginButtonText}>
                            Entrar
                        </Text>
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
        backgroundColor: '#FAFAFA', 
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
        backgroundColor: '#fff', // Garante fundo branco no card
        borderRadius: 12,
        // Sombra leve para destacar
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
    },
    label: {
        fontSize: 14,
        marginBottom: 4,
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 14, 
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: '#fff',
        fontSize: 16,
        color: '#333', // IMPORTANTE: Texto escuro
    },
    loginButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        minHeight: 55,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    registerButton: {
        marginTop: 10,
        padding: 10,
    },
    registerButtonText: {
        fontSize: 14,
        color: '#666',
    },
    registerLink: {
        color: '#007bff',
        fontWeight: 'bold',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fdebeb',
        borderColor: '#d9534f',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#d9534f',
        marginLeft: 8,
        fontSize: 14,
    }
});

export default LoginScreen;