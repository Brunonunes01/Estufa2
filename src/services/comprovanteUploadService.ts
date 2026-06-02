import * as DocumentPicker from 'expo-document-picker';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  bytes: number;
  format?: string;
  original_filename?: string;
};

export type ComprovanteUpload = {
  comprovanteUrl: string;
  comprovantePublicId: string;
  comprovanteNome: string;
  comprovanteMime: string;
  comprovanteBytes: number;
};

const getCloudinaryConfig = () => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary nao configurado. Defina EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME e EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  const normalizedCloudName = cloudName.trim();
  const normalizedPreset = uploadPreset.trim();
  if (!normalizedCloudName || !normalizedPreset) {
    throw new Error('Configuracao do Cloudinary invalida no .env.');
  }

  return { cloudName: normalizedCloudName, uploadPreset: normalizedPreset };
};

const normalizeMimeType = (mimeType?: string | null, filename?: string) => {
  if (mimeType) return mimeType.toLowerCase();
  const lowerName = String(filename || '').toLowerCase();
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  return '';
};

const validateFile = (file: DocumentPicker.DocumentPickerAsset) => {
  const mimeType = normalizeMimeType(file.mimeType, file.name);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Formato invalido. Use JPG, PNG ou PDF.');
  }
  if (!file.size || file.size <= 0) {
    throw new Error('Arquivo invalido.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Arquivo muito grande. Limite de 5MB.');
  }
  return mimeType;
};

export const pickComprovante = async (): Promise<DocumentPicker.DocumentPickerAsset | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
};

export const uploadComprovanteToCloudinary = async (
  file: DocumentPicker.DocumentPickerAsset,
  tenantId: string
): Promise<ComprovanteUpload> => {
  const mimeType = validateFile(file);
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';

  const body = new FormData();
  body.append('file', {
    uri: file.uri,
    type: mimeType,
    name: file.name || `comprovante-${Date.now()}`,
  } as any);
  body.append('upload_preset', uploadPreset);
  body.append('folder', `sge/comprovantes/${tenantId}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    let details = '';
    try {
      const errPayload = await response.json();
      details = String(errPayload?.error?.message || errPayload?.message || '').trim();
    } catch (_error) {
      details = '';
    }
    throw new Error(details ? `Falha no upload do comprovante: ${details}` : 'Falha no upload do comprovante.');
  }

  const payload = (await response.json()) as CloudinaryUploadResult;
  if (!payload?.secure_url || !payload?.public_id) {
    throw new Error('Resposta invalida do Cloudinary.');
  }

  return {
    comprovanteUrl: payload.secure_url,
    comprovantePublicId: payload.public_id,
    comprovanteNome: file.name || payload.original_filename || 'comprovante',
    comprovanteMime: mimeType,
    comprovanteBytes: Number(payload.bytes || file.size || 0),
  };
};
