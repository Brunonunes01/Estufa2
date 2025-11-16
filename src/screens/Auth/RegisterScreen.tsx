// src/screens/Auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native'; // Importe o Alert
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = () => {
    console.log('Botão "Criar conta" pressionado.'); // LOG 1
    setError('');

    // Validação simples no app
    if (name === '' || email === '' || password === '') {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    console.log('Tentando registrar no Firebase com:', email); // LOG 2
    
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        
        console.log('Usuário criado no Auth:', userCredential.user.uid); // LOG 3
        const user = userCredential.user;
        
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          name: name,
          email: email,
          role: "admin",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log('Documento criado no Firestore.'); // LOG 4
        
        // Sucesso!
        Alert.alert('Sucesso!', 'Sua conta foi criada.');
        // O AuthContext vai detectar o login e mudar a tela.

      })
      .catch((err) => {
        // Erro!
        console.error('ERRO NO REGISTRO:', err.code, err.message); // LOG 5
        
        // Traduzindo erros comuns do Firebase
        if (err.code === 'auth/email-already-in-use') {
          setError('Este e-mail já está em uso.');
        } else if (err.code === 'auth/invalid-email') {
          setError('O formato do e-mail é inválido.');
        } else if (err.code === 'auth/weak-password') {
          setError('A senha é muito fraca (mínimo 6 caracteres).');
        } else {
          // Outro erro
          setError(err.message);
        }
      });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, textAlign: 'center' }}>Criar Conta</Text>
      <TextInput
        placeholder="Nome"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
      />
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
      
      <Button title="Criar conta" onPress={handleRegister} />
      <Button
        title="Já tenho conta"
        onPress={() => navigation.navigate('Login')}
      />
    </View>
  );
};

export default RegisterScreen;