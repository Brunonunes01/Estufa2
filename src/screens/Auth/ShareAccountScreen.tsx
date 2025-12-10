// src/screens/Auth/ShareAccountScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { shareAccountByEmail } from '../../services/shareService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../components/Card';

const ShareAccountScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!email) {
        Alert.alert("Erro", "Digite o e-mail do parceiro.");
        return;
    }
    if (!user) return;

    setLoading(true);
    try {
        const partnerName = await shareAccountByEmail(email.trim().toLowerCase(), user);
        Alert.alert("Sucesso", `Agora ${partnerName} tem acesso aos seus dados.`);
        setEmail('');
        navigation.goBack();
    } catch (error: any) {
        Alert.alert("Erro", error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="account-key" size={50} color="#4CAF50" />
        </View>
        <Text style={styles.title}>Compartilhar Acesso</Text>
        <Text style={styles.description}>
            Digite o e-mail do seu sócio ou parceiro. Ele precisa já ter baixado o app e criado uma conta.
            {"\n\n"}
            Ao confirmar, ele poderá visualizar e editar suas estufas, plantios e vendas.
        </Text>

        <Text style={styles.label}>E-mail do Parceiro</Text>
        <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="exemplo@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
        />

        <TouchableOpacity 
            style={styles.button} 
            onPress={handleShare}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Conceder Acesso</Text>}
        </TouchableOpacity>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA', justifyContent: 'center' },
    card: { padding: 25, backgroundColor: '#fff', borderRadius: 12, elevation: 3 },
    iconContainer: { alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    description: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
    button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ShareAccountScreen;