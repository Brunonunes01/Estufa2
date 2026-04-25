import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

interface UseGoogleAuthOptions {
  onError?: (message: string) => void;
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;
const APP_SCHEME = 'estufapro';

export const useGoogleAuth = ({ onError }: UseGoogleAuthOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: APP_SCHEME,
        path: 'oauthredirect',
      }),
    []
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID || '',
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  const hasClientId = useMemo(() => Boolean(GOOGLE_WEB_CLIENT_ID), []);

  const ensureUserDocument = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const displayName = firebaseUser.displayName?.trim() || firebaseUser.email?.split('@')[0] || 'Usuário';
    const now = Timestamp.now();

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: displayName,
        email: firebaseUser.email || '',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    await setDoc(
      userRef,
      {
        name: displayName,
        email: firebaseUser.email || '',
        updatedAt: now,
      },
      { merge: true }
    );
  }, []);

  useEffect(() => {
    const processGoogleResponse = async () => {
      if (!response) return;

      if (response.type !== 'success') {
        setIsLoading(false);
        if (response.type !== 'dismiss') {
          onError?.('Não foi possível autenticar com Google.');
        }
        return;
      }

      const idToken = response.params?.id_token;
      if (!idToken) {
        setIsLoading(false);
        onError?.('Token do Google inválido. Verifique os Client IDs.');
        return;
      }

      try {
        setIsLoading(true);
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        await ensureUserDocument();
      } catch (error) {
        onError?.('Falha ao concluir login com Google.');
      } finally {
        setIsLoading(false);
      }
    };

    processGoogleResponse();
  }, [ensureUserDocument, onError, response]);

  const signInWithGoogle = useCallback(async () => {
    if (!hasClientId) {
      onError?.('Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (e preferencialmente Android/iOS também).');
      return;
    }

    try {
      setIsLoading(true);
      await promptAsync({
        showInRecents: true,
        ...(Platform.OS !== 'web' ? { preferEphemeralSession: true } : {}),
      });
    } catch (error) {
      setIsLoading(false);
      onError?.('Falha ao abrir o login do Google.');
    }
  }, [hasClientId, onError, promptAsync]);

  const disabled = isLoading || !request;

  return {
    signInWithGoogle,
    loadingGoogle: isLoading,
    googleDisabled: disabled,
  };
};

export default useGoogleAuth;
