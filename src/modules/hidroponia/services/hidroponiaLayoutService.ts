import { Estufa, HydroEstrutura, HydroMotor, HydroSetor } from '../../../types/domain';
import { getEstufaById, updateEstufa } from '../../../services/estufaService';
import { listHydroOcupacoesByEstufa } from './hidroponiaOcupacaoService';

type AddSetorInput = {
  nome: string;
  motorId: string;
};

type AddEstruturaInput = {
  setorId: string;
  nome?: string;
  tipo: HydroEstrutura['tipo'];
  capacidadePlantas: number;
};

type AddMotorInput = {
  nome: string;
  codigo?: string;
  status?: HydroMotor['status'];
  observacoes?: string;
  setorIds?: string[];
};

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getNextStructureCode = (setor: HydroSetor) => {
  const prefix = 'B';
  const next = (setor.estruturas || []).length + 1;
  return `${prefix}${String(next).padStart(2, '0')}`;
};

const normalizeSetores = (estufa: Estufa): HydroSetor[] => estufa.setores || [];
const normalizeMotores = (estufa: Estufa): HydroMotor[] => estufa.motores || [];

const findMotorOrThrow = (motores: HydroMotor[], motorId: string) => {
  const id = String(motorId || '').trim();
  const motor = motores.find((item) => item.id === id);
  if (!motor) throw new Error('Motor selecionado não foi encontrado na estufa.');
  return motor;
};

const getEstruturaIds = (setores: HydroSetor[]) =>
  setores.flatMap((setor) => (setor.estruturas || []).map((estrutura) => estrutura.id));

export const addHydroSetor = async (estufaId: string, input: AddSetorInput, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const setores = normalizeSetores(estufa);
  const motores = normalizeMotores(estufa);
  findMotorOrThrow(motores, input.motorId);
  const nextSetor: HydroSetor = {
    id: createId('setor'),
    nome: input.nome.trim(),
    motorId: input.motorId.trim(),
    estruturas: [],
  };

  await updateEstufa(estufaId, { setores: [...setores, nextSetor] }, userId);
  return nextSetor;
};

export const addHydroEstrutura = async (estufaId: string, input: AddEstruturaInput, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const setores = normalizeSetores(estufa);
  const setoresAtualizados = setores.map((setor) => {
    if (setor.id !== input.setorId) return setor;

    const codigo = getNextStructureCode(setor);
    const capacidade = Math.max(0, Number(input.capacidadePlantas || 0));
    const estrutura: HydroEstrutura = {
      id: createId('est'),
      codigo,
      nome: input.nome?.trim() || `${input.tipo === 'bercario' ? 'Bancada' : 'Perfil'} ${codigo}`,
      tipo: input.tipo,
      capacidadePlantas: capacidade,
      quantidadeFuros: capacidade,
      x: (setor.estruturas || []).length % 2,
      y: Math.floor((setor.estruturas || []).length / 2),
      ativo: true,
    };

    return { ...setor, estruturas: [...(setor.estruturas || []), estrutura] };
  });

  await updateEstufa(estufaId, { setores: setoresAtualizados }, userId);
};

export const updateHydroEstrutura = async (estufaId: string, estruturaId: string, data: Partial<HydroEstrutura>, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  if (typeof data.capacidadePlantas === 'number') {
    const ocupacoes = await listHydroOcupacoesByEstufa(userId, estufaId);
    const ocupado = ocupacoes
      .filter((item) => item.estruturaId === estruturaId)
      .reduce((sum, item) => sum + Number(item.quantidadeAlocada || 0), 0);
    if (Number(data.capacidadePlantas || 0) < ocupado) {
      throw new Error(`Capacidade inválida: a bancada possui ${ocupado} mudas ativas.`);
    }
  }

  const setores = (estufa.setores || []).map(setor => ({
    ...setor,
    estruturas: (setor.estruturas || []).map(est => {
      if (est.id === estruturaId) {
        return { ...est, ...data };
      }
      return est;
    })
  }));

  await updateEstufa(estufaId, { setores }, userId);
};

export const deleteHydroEstrutura = async (estufaId: string, estruturaId: string, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const ocupacoes = await listHydroOcupacoesByEstufa(userId, estufaId);
  if (ocupacoes.some((item) => item.estruturaId === estruturaId && item.status === 'ativa')) {
    throw new Error('Não é possível excluir bancada com produção ativa.');
  }

  const setores = (estufa.setores || []).map(setor => ({
    ...setor,
    estruturas: (setor.estruturas || []).filter(est => est.id !== estruturaId)
  }));

  await updateEstufa(estufaId, { setores }, userId);
};

export const updateHydroSetor = async (estufaId: string, setorId: string, data: Partial<HydroSetor>, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');
  const motores = normalizeMotores(estufa);
  if (data.motorId !== undefined) {
    findMotorOrThrow(motores, data.motorId);
  }

  const setores = (estufa.setores || []).map(setor => {
    if (setor.id === setorId) {
      return { ...setor, ...data };
    }
    return setor;
  });

  await updateEstufa(estufaId, { setores }, userId);
};

export const deleteHydroSetor = async (estufaId: string, setorId: string, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const setor = (estufa.setores || []).find((item) => item.id === setorId);
  if (!setor) throw new Error('Setor não encontrado.');

  const estruturaIds = new Set(getEstruturaIds([setor]));
  if (estruturaIds.size > 0) {
    const ocupacoes = await listHydroOcupacoesByEstufa(userId, estufaId);
    if (ocupacoes.some((item) => estruturaIds.has(item.estruturaId) && item.status === 'ativa')) {
      throw new Error('Não é possível excluir setor com bancadas ocupadas.');
    }
  }

  const setores = (estufa.setores || []).filter(setor => setor.id !== setorId);
  await updateEstufa(estufaId, { setores }, userId);
};

export const addHydroMotor = async (estufaId: string, input: AddMotorInput, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const nome = String(input.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do motor.');

  const codigoNormalizado = String(input.codigo || '').trim().toUpperCase();
  const motores = normalizeMotores(estufa);
  if (
    codigoNormalizado &&
    motores.some((motor) => String(motor.codigo || '').trim().toUpperCase() === codigoNormalizado)
  ) {
    throw new Error('Já existe um motor com este código na estufa.');
  }

  const motorId = createId('motor');
  const nextMotor: HydroMotor = {
    id: motorId,
    nome,
    codigo: codigoNormalizado || undefined,
    status: input.status || 'ativo',
    observacoes: input.observacoes?.trim() || undefined,
  };

  const updateData: Partial<Estufa> = {
    motores: [...motores, nextMotor],
  };

  // Vínculo opcional com setores no ato da criação
  if (Array.isArray(input.setorIds) && input.setorIds.length > 0) {
    const sectorIdsSet = new Set(input.setorIds);
    updateData.setores = normalizeSetores(estufa).map((setor) => {
      if (sectorIdsSet.has(setor.id)) {
        return { ...setor, motorId };
      }
      return setor;
    });
  }

  await updateEstufa(estufaId, updateData, userId);
  return nextMotor;
};

export const updateHydroMotor = async (
  estufaId: string,
  motorId: string,
  data: Partial<HydroMotor> & { setorIds?: string[] },
  userId: string
) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const motores = normalizeMotores(estufa);
  const target = motores.find((item) => item.id === motorId);
  if (!target) throw new Error('Motor não encontrado.');

  const codigoNormalizado =
    data.codigo !== undefined ? String(data.codigo || '').trim().toUpperCase() : undefined;
  if (
    codigoNormalizado !== undefined &&
    codigoNormalizado &&
    motores.some(
      (motor) =>
        motor.id !== motorId && String(motor.codigo || '').trim().toUpperCase() === codigoNormalizado
    )
  ) {
    throw new Error('Já existe outro motor com este código na estufa.');
  }

  const nomeNormalizado = data.nome !== undefined ? String(data.nome || '').trim() : undefined;
  if (nomeNormalizado !== undefined && !nomeNormalizado) {
    throw new Error('Informe o nome do motor.');
  }

  const motoresAtualizados = motores.map((motor) => {
    if (motor.id !== motorId) return motor;
    return {
      ...motor,
      ...data,
      nome: nomeNormalizado !== undefined ? nomeNormalizado : motor.nome,
      codigo: codigoNormalizado !== undefined ? codigoNormalizado || undefined : motor.codigo,
      observacoes:
        data.observacoes !== undefined ? String(data.observacoes || '').trim() || undefined : motor.observacoes,
    };
  });

  const updateData: Partial<Estufa> = {
    motores: motoresAtualizados,
  };

  // Atualização dos vínculos com setores
  if (Array.isArray(data.setorIds)) {
    const sectorIdsSet = new Set(data.setorIds);
    updateData.setores = normalizeSetores(estufa).map((setor) => {
      // Se estava no motor e não está mais no set, remove o vínculo? 
      // Não, setores SEMPRE precisam de um motor. Se o usuário desmarcou, talvez devêssemos manter ou exigir troca.
      // Seguindo a lógica de "vincular", vamos apenas garantir que os selecionados usem este motor.
      if (sectorIdsSet.has(setor.id)) {
        return { ...setor, motorId };
      }
      return setor;
    });
  }

  await updateEstufa(estufaId, updateData, userId);
};

export const deleteHydroMotor = async (estufaId: string, motorId: string, userId: string) => {
  const estufa = await getEstufaById(estufaId, userId);
  if (!estufa) throw new Error('Estufa não encontrada.');

  const motores = normalizeMotores(estufa);
  if (!motores.some((motor) => motor.id === motorId)) {
    throw new Error('Motor não encontrado.');
  }

  const setoresVinculados = normalizeSetores(estufa).filter((setor) => setor.motorId === motorId);
  if (setoresVinculados.length > 0) {
    throw new Error('Não é possível excluir motor vinculado a setores. Realoque os setores primeiro.');
  }

  const motoresAtualizados = motores.filter((motor) => motor.id !== motorId);
  await updateEstufa(estufaId, { motores: motoresAtualizados }, userId);
};
