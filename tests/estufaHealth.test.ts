import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEstufaHealth } from '../src/utils/estufaHealth.ts';
import type { Estufa, Plantio, RegistroManejo } from '../src/types/domain.ts';
import { Timestamp } from '../src/lib/timestamp.ts';

const mockEstufa: Estufa = {
  id: 'estufa-1',
  nome: 'Estufa Teste',
  status: 'ativa',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  motores: [
    { id: 'm1', nome: 'Motor 1', status: 'ativo' }
  ]
};

const mockPlantioAtivo: Plantio = {
  id: 'plantio-1',
  estufaId: 'estufa-1',
  cultura: 'Alface',
  status: 'em_crescimento',
  previsaoColheita: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)), // 10 dias no futuro
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

test('deve retornar OK para uma estufa ativa com plantio saudável', () => {
  const health = evaluateEstufaHealth(mockEstufa, [mockPlantioAtivo]);
  assert.equal(health.level, 'ok');
  assert.equal(health.reasons.length, 0);
});

test('deve retornar ATENCAO para motor em manutencao', () => {
  const estufaComProblema: Estufa = {
    ...mockEstufa,
    motores: [{ id: 'm1', nome: 'Motor 1', status: 'manutencao' }]
  };
  const health = evaluateEstufaHealth(estufaComProblema, [mockPlantioAtivo]);
  assert.equal(health.level, 'warning');
  assert.ok(health.reasons.some(r => r.includes('motor(es) com falha')));
});

test('deve retornar CRITICO para alerta sanitário recente', () => {
  const manejoCritico: RegistroManejo = {
    id: 'm1',
    estufaId: 'estufa-1',
    plantioId: 'plantio-1',
    tipoManejo: 'praga_doenca',
    severidade: 'alta',
    dataRegistro: Timestamp.fromDate(new Date()), // Hoje
    descricao: 'Presença de praga X',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const health = evaluateEstufaHealth(mockEstufa, [mockPlantioAtivo], [manejoCritico]);
  assert.equal(health.level, 'critical');
  assert.ok(health.reasons.some(r => r.includes('Alerta sanitário')));
});

test('deve ignorar alerta sanitário antigo (> 7 dias)', () => {
  const manejoAntigo: RegistroManejo = {
    id: 'm1',
    estufaId: 'estufa-1',
    plantioId: 'plantio-1',
    tipoManejo: 'praga_doenca',
    severidade: 'alta',
    dataRegistro: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)), // 10 dias atrás
    descricao: 'Presença de praga X antiga',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const health = evaluateEstufaHealth(mockEstufa, [mockPlantioAtivo], [manejoAntigo]);
  assert.equal(health.level, 'ok');
});

test('deve priorizar nível crítico sobre aviso de motor', () => {
  const estufaComMotorRuim: Estufa = {
    ...mockEstufa,
    motores: [{ id: 'm1', nome: 'Motor 1', status: 'inativo' }]
  };
  const manejoCritico: RegistroManejo = {
    id: 'm1',
    estufaId: 'estufa-1',
    plantioId: 'plantio-1',
    tipoManejo: 'praga_doenca',
    severidade: 'alta',
    dataRegistro: Timestamp.fromDate(new Date()),
    descricao: 'Praga severa',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const health = evaluateEstufaHealth(estufaComMotorRuim, [mockPlantioAtivo], [manejoCritico]);
  assert.equal(health.level, 'critical');
  assert.equal(health.reasons.length, 2); // Motor e Praga
});
