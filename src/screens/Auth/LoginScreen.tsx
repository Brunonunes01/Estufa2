// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Para mostrar um "carregando"

  const handleLogin = () => {
    console.log('Botão "Entrar" pressionado.'); // LOG 1
    setError('');
    setLoading(true); // Começa a carregar

    if (email === '' || password === '') {
      setError('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }
    
    console.log('Tentando logar com:', email); // LOG 2

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Sucesso!
        console.log('Login bem-sucedido:', userCredential.user.uid); // LOG 3
        // O AuthContext vai cuidar do redirecionamento
        setLoading(false);
      })
      .catch((err) => {
        // Erro!
        console.error('ERRO NO LOGIN:', err.code, err.message); // LOG 4
        setLoading(false);

        // Traduzindo erros comuns do Firebase
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
          setError('Usuário não encontrado com este e-mail.');
        } else if (err.code === 'auth/wrong-password') {
          setError('Senha incorreta. Tente novamente.');
        } else if (err.code === 'auth/invalid-credential') {
          // Erro genérico para "email não existe" OU "senha errada"
          setError('Credenciais inválidas. Verifique o e-mail e a senha.');
        } else {
          // Outro erro
          setError('Erro ao tentar logar. Tente mais tarde.');
        }
      });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, textAlign: 'center' }}>SGE - Entrar</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
      />
      <TextInput
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
      />
      
      {/* Mensagem de erro melhorada */}
      {error && <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>{error}</Text>}
      
      {/* Feedback de Loading */}
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title="Entrar" onPress={handleLogin} />
          <Button
            title="Criar conta"
            onPress={() => navigation.navigate('Register')}
          />
        </>
      )}
    </View>
  );
};

export default LoginScreen;