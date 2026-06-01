export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aplicacao_itens: {
        Row: {
          aplicacao_id: string
          created_at: string
          custo_unitario_na_aplicacao: number | null
          dose_por_tanque: number | null
          id: string
          insumo_id: string | null
          nome_insumo: string
          quantidade_aplicada: number
          tenant_id: string
          unidade: string
          updated_at: string
        }
        Insert: {
          aplicacao_id: string
          created_at?: string
          custo_unitario_na_aplicacao?: number | null
          dose_por_tanque?: number | null
          id?: string
          insumo_id?: string | null
          nome_insumo: string
          quantidade_aplicada: number
          tenant_id: string
          unidade: string
          updated_at?: string
        }
        Update: {
          aplicacao_id?: string
          created_at?: string
          custo_unitario_na_aplicacao?: number | null
          dose_por_tanque?: number | null
          id?: string
          insumo_id?: string | null
          nome_insumo?: string
          quantidade_aplicada?: number
          tenant_id?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aplicacao_itens_aplicacao_id_fkey"
            columns: ["aplicacao_id"]
            isOneToOne: false
            referencedRelation: "aplicacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacao_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacao_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      aplicacoes: {
        Row: {
          created_at: string
          created_by: string | null
          custo_calculado: number
          data_aplicacao: string
          estufa_id: string | null
          id: string
          numero_tanques: number | null
          observacoes: string | null
          plantio_id: string
          tenant_id: string
          tipo_aplicacao: string | null
          updated_at: string
          volume_tanque: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_calculado?: number
          data_aplicacao?: string
          estufa_id?: string | null
          id?: string
          numero_tanques?: number | null
          observacoes?: string | null
          plantio_id: string
          tenant_id: string
          tipo_aplicacao?: string | null
          updated_at?: string
          volume_tanque?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_calculado?: number
          data_aplicacao?: string
          estufa_id?: string | null
          id?: string
          numero_tanques?: number | null
          observacoes?: string | null
          plantio_id?: string
          tenant_id?: string
          tipo_aplicacao?: string | null
          updated_at?: string
          volume_tanque?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aplicacoes_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato_responsavel: string | null
          created_at: string
          created_by: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          telefone: string | null
          tenant_id: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_responsavel?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tenant_id: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_responsavel?: string | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tenant_id?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colheitas: {
        Row: {
          ciclo_desbloqueado_por_admin: boolean
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_colheita: string
          data_pagamento: string | null
          desbloqueio_admin_at: string | null
          desbloqueio_admin_by_name: string | null
          desbloqueio_admin_by_uid: string | null
          desbloqueio_admin_reason: string | null
          destino: string
          estufa_id: string | null
          id: string
          lote_colheita: string | null
          metodo_pagamento: string | null
          observacoes: string | null
          peso_bruto: number | null
          peso_liquido: number | null
          plantio_id: string
          preco_unitario: number | null
          qualidade: string | null
          quantidade: number
          safra_id: string | null
          status_pagamento:
            | Database["public"]["Enums"]["pagamento_status"]
            | null
          tenant_id: string
          unidade: string | null
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          ciclo_desbloqueado_por_admin?: boolean
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_colheita?: string
          data_pagamento?: string | null
          desbloqueio_admin_at?: string | null
          desbloqueio_admin_by_name?: string | null
          desbloqueio_admin_by_uid?: string | null
          desbloqueio_admin_reason?: string | null
          destino: string
          estufa_id?: string | null
          id?: string
          lote_colheita?: string | null
          metodo_pagamento?: string | null
          observacoes?: string | null
          peso_bruto?: number | null
          peso_liquido?: number | null
          plantio_id: string
          preco_unitario?: number | null
          qualidade?: string | null
          quantidade: number
          safra_id?: string | null
          status_pagamento?:
            | Database["public"]["Enums"]["pagamento_status"]
            | null
          tenant_id: string
          unidade?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          ciclo_desbloqueado_por_admin?: boolean
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_colheita?: string
          data_pagamento?: string | null
          desbloqueio_admin_at?: string | null
          desbloqueio_admin_by_name?: string | null
          desbloqueio_admin_by_uid?: string | null
          desbloqueio_admin_reason?: string | null
          destino?: string
          estufa_id?: string | null
          id?: string
          lote_colheita?: string | null
          metodo_pagamento?: string | null
          observacoes?: string | null
          peso_bruto?: number | null
          peso_liquido?: number | null
          plantio_id?: string
          preco_unitario?: number | null
          qualidade?: string | null
          quantidade?: number
          safra_id?: string | null
          status_pagamento?:
            | Database["public"]["Enums"]["pagamento_status"]
            | null
          tenant_id?: string
          unidade?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colheitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colheitas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: Database["public"]["Enums"]["despesa_categoria"]
          created_at: string
          created_by: string | null
          data_despesa: string
          data_vencimento: string | null
          descricao: string
          estufa_id: string | null
          id: string
          observacoes: string | null
          plantio_id: string | null
          status_pagamento: Database["public"]["Enums"]["pagamento_status"]
          tenant_id: string
          tipo_gasto: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["despesa_categoria"]
          created_at?: string
          created_by?: string | null
          data_despesa?: string
          data_vencimento?: string | null
          descricao: string
          estufa_id?: string | null
          id?: string
          observacoes?: string | null
          plantio_id?: string | null
          status_pagamento?: Database["public"]["Enums"]["pagamento_status"]
          tenant_id: string
          tipo_gasto?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["despesa_categoria"]
          created_at?: string
          created_by?: string | null
          data_despesa?: string
          data_vencimento?: string | null
          descricao?: string
          estufa_id?: string | null
          id?: string
          observacoes?: string | null
          plantio_id?: string | null
          status_pagamento?: Database["public"]["Enums"]["pagamento_status"]
          tenant_id?: string
          tipo_gasto?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estufas: {
        Row: {
          altura_m: number | null
          area_m2: number | null
          capacidade_total: number | null
          cidade: string | null
          comprimento_m: number | null
          created_at: string
          created_by: string | null
          data_inicio_operacao: string | null
          hydroponic_system_type:
            | Database["public"]["Enums"]["hydroponic_system_type"]
            | null
          id: string
          largura_m: number | null
          latitude: string | null
          legacy_motores: Json | null
          legacy_reservatorios: Json | null
          legacy_setores: Json | null
          legacy_subdivisoes: Json | null
          longitude: string | null
          nome: string
          observacoes: string | null
          percentual_ocupacao: number | null
          production_modes: Database["public"]["Enums"]["production_mode"][]
          propriedade: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["estufa_status"]
          tenant_id: string
          tipo: string | null
          tipo_cobertura: string | null
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          altura_m?: number | null
          area_m2?: number | null
          capacidade_total?: number | null
          cidade?: string | null
          comprimento_m?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio_operacao?: string | null
          hydroponic_system_type?:
            | Database["public"]["Enums"]["hydroponic_system_type"]
            | null
          id?: string
          largura_m?: number | null
          latitude?: string | null
          legacy_motores?: Json | null
          legacy_reservatorios?: Json | null
          legacy_setores?: Json | null
          legacy_subdivisoes?: Json | null
          longitude?: string | null
          nome: string
          observacoes?: string | null
          percentual_ocupacao?: number | null
          production_modes?: Database["public"]["Enums"]["production_mode"][]
          propriedade?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["estufa_status"]
          tenant_id: string
          tipo?: string | null
          tipo_cobertura?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          altura_m?: number | null
          area_m2?: number | null
          capacidade_total?: number | null
          cidade?: string | null
          comprimento_m?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio_operacao?: string | null
          hydroponic_system_type?:
            | Database["public"]["Enums"]["hydroponic_system_type"]
            | null
          id?: string
          largura_m?: number | null
          latitude?: string | null
          legacy_motores?: Json | null
          legacy_reservatorios?: Json | null
          legacy_setores?: Json | null
          legacy_subdivisoes?: Json | null
          longitude?: string | null
          nome?: string
          observacoes?: string | null
          percentual_ocupacao?: number | null
          production_modes?: Database["public"]["Enums"]["production_mode"][]
          propriedade?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["estufa_status"]
          tenant_id?: string
          tipo?: string | null
          tipo_cobertura?: string | null
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estufas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          categoria: string | null
          contato: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_estruturas: {
        Row: {
          ativo: boolean
          capacidade_plantas: number | null
          codigo: string | null
          created_at: string
          created_by: string | null
          estufa_id: string
          id: string
          nome: string
          quantidade_furos: number | null
          reservatorio_id: string | null
          setor_id: string | null
          tenant_id: string
          tipo: string
          updated_at: string
          x: number | null
          y: number | null
        }
        Insert: {
          ativo?: boolean
          capacidade_plantas?: number | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          estufa_id: string
          id?: string
          nome: string
          quantidade_furos?: number | null
          reservatorio_id?: string | null
          setor_id?: string | null
          tenant_id: string
          tipo: string
          updated_at?: string
          x?: number | null
          y?: number | null
        }
        Update: {
          ativo?: boolean
          capacidade_plantas?: number | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          estufa_id?: string
          id?: string
          nome?: string
          quantidade_furos?: number | null
          reservatorio_id?: string | null
          setor_id?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_estruturas_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_estruturas_reservatorio_id_fkey"
            columns: ["reservatorio_id"]
            isOneToOne: false
            referencedRelation: "hidro_reservatorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_estruturas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "hidro_setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_estruturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_leituras: {
        Row: {
          acao: string
          aplicar_em_todos_setores_do_motor: boolean
          condutividade_eletrica: number | null
          created_at: string
          created_by: string | null
          estrutura_id: string | null
          estufa_id: string
          id: string
          insumos_adicionados: Json | null
          lote_id: string | null
          measured_at: string
          motor_id: string | null
          observacoes: string | null
          ph: number | null
          reservatorio_id: string | null
          responsavel: string | null
          setores_aplicados_ids: string[] | null
          temperatura_ambiente: number | null
          temperatura_solucao: number | null
          tenant_id: string
          umidade_ambiente: number | null
          updated_at: string
          volume_litros: number | null
        }
        Insert: {
          acao: string
          aplicar_em_todos_setores_do_motor?: boolean
          condutividade_eletrica?: number | null
          created_at?: string
          created_by?: string | null
          estrutura_id?: string | null
          estufa_id: string
          id?: string
          insumos_adicionados?: Json | null
          lote_id?: string | null
          measured_at?: string
          motor_id?: string | null
          observacoes?: string | null
          ph?: number | null
          reservatorio_id?: string | null
          responsavel?: string | null
          setores_aplicados_ids?: string[] | null
          temperatura_ambiente?: number | null
          temperatura_solucao?: number | null
          tenant_id: string
          umidade_ambiente?: number | null
          updated_at?: string
          volume_litros?: number | null
        }
        Update: {
          acao?: string
          aplicar_em_todos_setores_do_motor?: boolean
          condutividade_eletrica?: number | null
          created_at?: string
          created_by?: string | null
          estrutura_id?: string | null
          estufa_id?: string
          id?: string
          insumos_adicionados?: Json | null
          lote_id?: string | null
          measured_at?: string
          motor_id?: string | null
          observacoes?: string | null
          ph?: number | null
          reservatorio_id?: string | null
          responsavel?: string | null
          setores_aplicados_ids?: string[] | null
          temperatura_ambiente?: number | null
          temperatura_solucao?: number | null
          tenant_id?: string
          umidade_ambiente?: number | null
          updated_at?: string
          volume_litros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_leituras_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_leituras_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "hidro_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_leituras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_lotes: {
        Row: {
          codigo_lote: string
          created_at: string
          created_by: string | null
          cultura_base: string | null
          estufa_id: string
          id: string
          nome_operacional: string | null
          origem_material_documento: string | null
          origem_material_nome: string
          quantidade_inicial: number
          saldo_disponivel: number
          setor_id: string
          status: string
          tenant_id: string
          updated_at: string
          variedade_base: string | null
          verdura_id: string | null
        }
        Insert: {
          codigo_lote: string
          created_at?: string
          created_by?: string | null
          cultura_base?: string | null
          estufa_id: string
          id?: string
          nome_operacional?: string | null
          origem_material_documento?: string | null
          origem_material_nome: string
          quantidade_inicial: number
          saldo_disponivel: number
          setor_id: string
          status: string
          tenant_id: string
          updated_at?: string
          variedade_base?: string | null
          verdura_id?: string | null
        }
        Update: {
          codigo_lote?: string
          created_at?: string
          created_by?: string | null
          cultura_base?: string | null
          estufa_id?: string
          id?: string
          nome_operacional?: string | null
          origem_material_documento?: string | null
          origem_material_nome?: string
          quantidade_inicial?: number
          saldo_disponivel?: number
          setor_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          variedade_base?: string | null
          verdura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_lotes_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_lotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_motores: {
        Row: {
          codigo: string | null
          created_at: string
          created_by: string | null
          estufa_id: string
          id: string
          nome: string
          observacoes: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          estufa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          estufa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidro_motores_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_motores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_movimentacoes: {
        Row: {
          created_at: string
          created_by: string | null
          cultura: string | null
          estufa_id: string
          fase: string
          from_estrutura_id: string | null
          id: string
          lote_id: string
          moved_at: string
          quantidade: number
          tenant_id: string
          tipo: string
          to_estrutura_id: string | null
          updated_at: string
          variedade: string | null
          verdura_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cultura?: string | null
          estufa_id: string
          fase: string
          from_estrutura_id?: string | null
          id?: string
          lote_id: string
          moved_at?: string
          quantidade: number
          tenant_id: string
          tipo: string
          to_estrutura_id?: string | null
          updated_at?: string
          variedade?: string | null
          verdura_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cultura?: string | null
          estufa_id?: string
          fase?: string
          from_estrutura_id?: string | null
          id?: string
          lote_id?: string
          moved_at?: string
          quantidade?: number
          tenant_id?: string
          tipo?: string
          to_estrutura_id?: string | null
          updated_at?: string
          variedade?: string | null
          verdura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_movimentacoes_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_movimentacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "hidro_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_movimentacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_ocupacoes: {
        Row: {
          created_at: string
          created_by: string | null
          cultura: string
          data_fim: string | null
          data_inicio: string
          estrutura_id: string
          estufa_id: string
          fase: string
          id: string
          lote_id: string
          quantidade_alocada: number
          quantidade_perdida: number | null
          setor_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          variedade: string | null
          verdura_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cultura: string
          data_fim?: string | null
          data_inicio?: string
          estrutura_id: string
          estufa_id: string
          fase: string
          id?: string
          lote_id: string
          quantidade_alocada: number
          quantidade_perdida?: number | null
          setor_id?: string | null
          status: string
          tenant_id: string
          updated_at?: string
          variedade?: string | null
          verdura_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cultura?: string
          data_fim?: string | null
          data_inicio?: string
          estrutura_id?: string
          estufa_id?: string
          fase?: string
          id?: string
          lote_id?: string
          quantidade_alocada?: number
          quantidade_perdida?: number | null
          setor_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          variedade?: string | null
          verdura_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_ocupacoes_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_ocupacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "hidro_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_ocupacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_reservatorios: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          estufa_id: string
          id: string
          nome: string
          setor_id: string | null
          tenant_id: string
          updated_at: string
          volume_litros: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          estufa_id: string
          id?: string
          nome: string
          setor_id?: string | null
          tenant_id: string
          updated_at?: string
          volume_litros?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          estufa_id?: string
          id?: string
          nome?: string
          setor_id?: string | null
          tenant_id?: string
          updated_at?: string
          volume_litros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_reservatorios_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_reservatorios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "hidro_setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_reservatorios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_setores: {
        Row: {
          created_at: string
          created_by: string | null
          estufa_id: string
          id: string
          motor_id: string | null
          nome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estufa_id: string
          id?: string
          motor_id?: string | null
          nome: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estufa_id?: string
          id?: string
          motor_id?: string | null
          nome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidro_setores_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_setores_motor_id_fkey"
            columns: ["motor_id"]
            isOneToOne: false
            referencedRelation: "hidro_motores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidro_setores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hidro_verduras: {
        Row: {
          ativo: boolean
          ciclo_dias: number | null
          created_at: string
          created_by: string | null
          ec_max: number | null
          ec_min: number | null
          id: string
          nome_cientifico: string | null
          nome_comum: string
          observacoes: string | null
          ph_max: number | null
          ph_min: number | null
          temperatura_max_c: number | null
          temperatura_min_c: number | null
          tenant_id: string
          updated_at: string
          variedade_padrao: string | null
        }
        Insert: {
          ativo?: boolean
          ciclo_dias?: number | null
          created_at?: string
          created_by?: string | null
          ec_max?: number | null
          ec_min?: number | null
          id?: string
          nome_cientifico?: string | null
          nome_comum: string
          observacoes?: string | null
          ph_max?: number | null
          ph_min?: number | null
          temperatura_max_c?: number | null
          temperatura_min_c?: number | null
          tenant_id: string
          updated_at?: string
          variedade_padrao?: string | null
        }
        Update: {
          ativo?: boolean
          ciclo_dias?: number | null
          created_at?: string
          created_by?: string | null
          ec_max?: number | null
          ec_min?: number | null
          id?: string
          nome_cientifico?: string | null
          nome_comum?: string
          observacoes?: string | null
          ph_max?: number | null
          ph_min?: number | null
          temperatura_max_c?: number | null
          temperatura_min_c?: number | null
          tenant_id?: string
          updated_at?: string
          variedade_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hidro_verduras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_entradas: {
        Row: {
          created_at: string
          created_by: string | null
          custo_unitario_compra: number
          data_entrada: string
          fornecedor_id: string | null
          id: string
          insumo_id: string
          observacoes: string | null
          quantidade_comprada: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario_compra: number
          data_entrada?: string
          fornecedor_id?: string | null
          id?: string
          insumo_id: string
          observacoes?: string | null
          quantidade_comprada: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario_compra?: number
          data_entrada?: string
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string
          observacoes?: string | null
          quantidade_comprada?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumo_entradas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_entradas_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_entradas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          custo_unitario: number
          data_validade: string | null
          dias_carencia: number | null
          estoque_atual: number
          estoque_minimo: number | null
          fabricante: string | null
          fornecedor_id: string | null
          id: string
          lote: string | null
          nome: string
          registro_mapa: string | null
          tenant_id: string
          tipo: string | null
          unidade_medida: string | null
          unidade_padrao: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          data_validade?: string | null
          dias_carencia?: number | null
          estoque_atual?: number
          estoque_minimo?: number | null
          fabricante?: string | null
          fornecedor_id?: string | null
          id?: string
          lote?: string | null
          nome: string
          registro_mapa?: string | null
          tenant_id: string
          tipo?: string | null
          unidade_medida?: string | null
          unidade_padrao?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          data_validade?: string | null
          dias_carencia?: number | null
          estoque_atual?: number
          estoque_minimo?: number | null
          fabricante?: string | null
          fornecedor_id?: string | null
          id?: string
          lote?: string | null
          nome?: string
          registro_mapa?: string | null
          tenant_id?: string
          tipo?: string | null
          unidade_medida?: string | null
          unidade_padrao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      manejos: {
        Row: {
          created_at: string
          created_by: string | null
          data_registro: string
          descricao: string
          estufa_id: string | null
          fotos: Json
          id: string
          plantio_id: string
          responsavel: string | null
          severidade: string | null
          temperatura: number | null
          tenant_id: string
          tipo_manejo: string
          umidade: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_registro?: string
          descricao: string
          estufa_id?: string | null
          fotos?: Json
          id?: string
          plantio_id: string
          responsavel?: string | null
          severidade?: string | null
          temperatura?: number | null
          tenant_id: string
          tipo_manejo: string
          umidade?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_registro?: string
          descricao?: string
          estufa_id?: string | null
          fotos?: Json
          id?: string
          plantio_id?: string
          responsavel?: string | null
          severidade?: string | null
          temperatura?: number | null
          tenant_id?: string
          tipo_manejo?: string
          umidade?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manejos_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manejos_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manejos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plantios: {
        Row: {
          ciclo_desbloqueado_por_admin: boolean
          ciclo_dias: number | null
          codigo_lote: string | null
          created_at: string
          created_by: string | null
          cultura: string
          custo_acumulado: number
          custo_estimado_inicial: number | null
          custo_total: number | null
          data_encerramento: string | null
          data_inicio: string | null
          data_plantio: string | null
          data_previsao_colheita: string | null
          desbloqueio_admin_at: string | null
          desbloqueio_admin_by_name: string | null
          desbloqueio_admin_by_uid: string | null
          desbloqueio_admin_reason: string | null
          estufa_id: string
          id: string
          mudas_por_bandeja: number | null
          observacoes: string | null
          ocupacao_estimada: number | null
          origem_semente: string | null
          preco_estimado_unidade: number | null
          quantidade_bandejas: number | null
          quantidade_plantada: number | null
          safra_id: string | null
          status: Database["public"]["Enums"]["plantio_status"]
          tenant_id: string
          unidade_preco_estimado: string | null
          unidade_quantidade: string | null
          updated_at: string
          variedade: string | null
        }
        Insert: {
          ciclo_desbloqueado_por_admin?: boolean
          ciclo_dias?: number | null
          codigo_lote?: string | null
          created_at?: string
          created_by?: string | null
          cultura: string
          custo_acumulado?: number
          custo_estimado_inicial?: number | null
          custo_total?: number | null
          data_encerramento?: string | null
          data_inicio?: string | null
          data_plantio?: string | null
          data_previsao_colheita?: string | null
          desbloqueio_admin_at?: string | null
          desbloqueio_admin_by_name?: string | null
          desbloqueio_admin_by_uid?: string | null
          desbloqueio_admin_reason?: string | null
          estufa_id: string
          id?: string
          mudas_por_bandeja?: number | null
          observacoes?: string | null
          ocupacao_estimada?: number | null
          origem_semente?: string | null
          preco_estimado_unidade?: number | null
          quantidade_bandejas?: number | null
          quantidade_plantada?: number | null
          safra_id?: string | null
          status?: Database["public"]["Enums"]["plantio_status"]
          tenant_id: string
          unidade_preco_estimado?: string | null
          unidade_quantidade?: string | null
          updated_at?: string
          variedade?: string | null
        }
        Update: {
          ciclo_desbloqueado_por_admin?: boolean
          ciclo_dias?: number | null
          codigo_lote?: string | null
          created_at?: string
          created_by?: string | null
          cultura?: string
          custo_acumulado?: number
          custo_estimado_inicial?: number | null
          custo_total?: number | null
          data_encerramento?: string | null
          data_inicio?: string | null
          data_plantio?: string | null
          data_previsao_colheita?: string | null
          desbloqueio_admin_at?: string | null
          desbloqueio_admin_by_name?: string | null
          desbloqueio_admin_by_uid?: string | null
          desbloqueio_admin_reason?: string | null
          estufa_id?: string
          id?: string
          mudas_por_bandeja?: number | null
          observacoes?: string | null
          ocupacao_estimada?: number | null
          origem_semente?: string | null
          preco_estimado_unidade?: number | null
          quantidade_bandejas?: number | null
          quantidade_plantada?: number | null
          safra_id?: string | null
          status?: Database["public"]["Enums"]["plantio_status"]
          tenant_id?: string
          unidade_preco_estimado?: string | null
          unidade_quantidade?: string | null
          updated_at?: string
          variedade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantios_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantios_safra_id_fkey"
            columns: ["safra_id"]
            isOneToOne: false
            referencedRelation: "safras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cidade_estado: string | null
          created_at: string
          email: string | null
          id: string
          is_support_agent: boolean
          latitude: string | null
          longitude: string | null
          name: string | null
          nome_propriedade: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["app_role"]
          support_level: string | null
          tamanho_hectares: string | null
          updated_at: string
        }
        Insert: {
          cidade_estado?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_support_agent?: boolean
          latitude?: string | null
          longitude?: string | null
          name?: string | null
          nome_propriedade?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          support_level?: string | null
          tamanho_hectares?: string | null
          updated_at?: string
        }
        Update: {
          cidade_estado?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_support_agent?: boolean
          latitude?: string | null
          longitude?: string | null
          name?: string | null
          nome_propriedade?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          support_level?: string | null
          tamanho_hectares?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rastreabilidade_eventos: {
        Row: {
          acao: string
          actor_name: string | null
          actor_uid: string | null
          created_at: string
          created_by: string | null
          descricao: string
          entidade: string
          entidade_id: string
          estufa_id: string | null
          event_at: string
          hydro_lote_id: string | null
          id: string
          metadata: Json | null
          motivo: string | null
          plantio_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          acao: string
          actor_name?: string | null
          actor_uid?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          entidade: string
          entidade_id: string
          estufa_id?: string | null
          event_at?: string
          hydro_lote_id?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          plantio_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          acao?: string
          actor_name?: string | null
          actor_uid?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          entidade?: string
          entidade_id?: string
          estufa_id?: string | null
          event_at?: string
          hydro_lote_id?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          plantio_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rastreabilidade_eventos_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rastreabilidade_eventos_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rastreabilidade_eventos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safras: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          nome: string
          observacoes: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          nome: string
          observacoes?: string | null
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      share_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          grant_role: Database["public"]["Enums"]["app_role"]
          id: string
          owner_name: string | null
          permissions: Json
          tenant_id: string
          tenant_name: string | null
          updated_at: string
          used_by: Json
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          grant_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          owner_name?: string | null
          permissions?: Json
          tenant_id: string
          tenant_name?: string | null
          updated_at?: string
          used_by?: Json
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          grant_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          owner_name?: string | null
          permissions?: Json
          tenant_id?: string
          tenant_name?: string | null
          updated_at?: string
          used_by?: Json
        }
        Relationships: [
          {
            foreignKeyName: "share_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_agricolas: {
        Row: {
          cancel_reason: string | null
          created_at: string
          created_by: string | null
          data_prevista: string
          estufa_id: string | null
          id: string
          observacoes: string | null
          plantio_id: string
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          status: Database["public"]["Enums"]["tarefa_status"]
          status_history: Json
          tenant_id: string
          tipo_tarefa: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista: string
          estufa_id?: string | null
          id?: string
          observacoes?: string | null
          plantio_id: string
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          status?: Database["public"]["Enums"]["tarefa_status"]
          status_history?: Json
          tenant_id: string
          tipo_tarefa: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista?: string
          estufa_id?: string | null
          id?: string
          observacoes?: string | null
          plantio_id?: string
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          status?: Database["public"]["Enums"]["tarefa_status"]
          status_history?: Json
          tenant_id?: string
          tipo_tarefa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_agricolas_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_agricolas_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_agricolas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          can_delete: boolean
          can_manage_sharing: boolean
          can_read: boolean
          can_write: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_manage_sharing?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_manage_sharing?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      venda_itens: {
        Row: {
          colheita_id: string | null
          created_at: string
          descricao: string
          id: string
          quantidade: number
          tenant_id: string
          unidade: string | null
          updated_at: string
          valor_unitario: number
          venda_id: string
        }
        Insert: {
          colheita_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          quantidade: number
          tenant_id: string
          unidade?: string | null
          updated_at?: string
          valor_unitario: number
          venda_id: string
        }
        Update: {
          colheita_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          quantidade?: number
          tenant_id?: string
          unidade?: string | null
          updated_at?: string
          valor_unitario?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_colheita_id_fkey"
            columns: ["colheita_id"]
            isOneToOne: false
            referencedRelation: "colheitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          ciclo_desbloqueado_por_admin: boolean
          cliente_id: string | null
          colheita_id: string | null
          created_at: string
          created_by: string | null
          data_vencimento: string | null
          data_venda: string
          desbloqueio_admin_at: string | null
          desbloqueio_admin_by_name: string | null
          desbloqueio_admin_by_uid: string | null
          desbloqueio_admin_reason: string | null
          estufa_id: string | null
          forma_pagamento: string | null
          hydro_lote_id: string | null
          id: string
          metodo_pagamento: string | null
          pagamento_para: string | null
          observacoes: string | null
          origin_id: string | null
          origin_type: string | null
          plantio_id: string | null
          quantidade: number | null
          status_pagamento: Database["public"]["Enums"]["pagamento_status"]
          tenant_id: string
          traceability_public_token: string | null
          traceability_public_url: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          ciclo_desbloqueado_por_admin?: boolean
          cliente_id?: string | null
          colheita_id?: string | null
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          data_venda?: string
          desbloqueio_admin_at?: string | null
          desbloqueio_admin_by_name?: string | null
          desbloqueio_admin_by_uid?: string | null
          desbloqueio_admin_reason?: string | null
          estufa_id?: string | null
          forma_pagamento?: string | null
          hydro_lote_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          pagamento_para?: string | null
          observacoes?: string | null
          origin_id?: string | null
          origin_type?: string | null
          plantio_id?: string | null
          quantidade?: number | null
          status_pagamento?: Database["public"]["Enums"]["pagamento_status"]
          tenant_id: string
          traceability_public_token?: string | null
          traceability_public_url?: string | null
          updated_at?: string
          valor_total: number
        }
        Update: {
          ciclo_desbloqueado_por_admin?: boolean
          cliente_id?: string | null
          colheita_id?: string | null
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          data_venda?: string
          desbloqueio_admin_at?: string | null
          desbloqueio_admin_by_name?: string | null
          desbloqueio_admin_by_uid?: string | null
          desbloqueio_admin_reason?: string | null
          estufa_id?: string | null
          forma_pagamento?: string | null
          hydro_lote_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          pagamento_para?: string | null
          observacoes?: string | null
          origin_id?: string | null
          origin_type?: string | null
          plantio_id?: string | null
          quantidade?: number | null
          status_pagamento?: Database["public"]["Enums"]["pagamento_status"]
          tenant_id?: string
          traceability_public_token?: string | null
          traceability_public_url?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_colheita_id_fkey"
            columns: ["colheita_id"]
            isOneToOne: false
            referencedRelation: "colheitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_estufa_id_fkey"
            columns: ["estufa_id"]
            isOneToOne: false
            referencedRelation: "estufas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_plantio_id_fkey"
            columns: ["plantio_id"]
            isOneToOne: false
            referencedRelation: "plantios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_financeiro_resumo: {
        Row: {
          referencia_mes: string | null
          tenant_id: string | null
          total_pagar: number | null
          total_pago: number | null
          total_receber: number | null
          total_recebido: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_delete_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      can_manage_sharing_tenant: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      can_write_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      redeem_share_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operator" | "guest"
      despesa_categoria:
        | "energia"
        | "agua"
        | "manutencao"
        | "mao_de_obra"
        | "outro"
      estufa_status: "ativa" | "manutencao" | "desativada"
      hydroponic_system_type:
        | "nft"
        | "dwc"
        | "floating"
        | "substrate"
        | "semi_hydroponic"
        | "other"
      pagamento_status: "pendente" | "pago" | "atrasado" | "cancelado"
      plantio_status:
        | "em_crescimento"
        | "colheita_iniciada"
        | "finalizado"
        | "abortado"
        | "em_desenvolvimento"
        | "em_colheita"
        | "cancelado"
      production_mode:
        | "long_cycle"
        | "hydroponics"
        | "seedlings"
        | "seedling_resale"
      tarefa_prioridade: "baixa" | "media" | "alta" | "critica"
      tarefa_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator", "guest"],
      despesa_categoria: [
        "energia",
        "agua",
        "manutencao",
        "mao_de_obra",
        "outro",
      ],
      estufa_status: ["ativa", "manutencao", "desativada"],
      hydroponic_system_type: [
        "nft",
        "dwc",
        "floating",
        "substrate",
        "semi_hydroponic",
        "other",
      ],
      pagamento_status: ["pendente", "pago", "atrasado", "cancelado"],
      plantio_status: [
        "em_crescimento",
        "colheita_iniciada",
        "finalizado",
        "abortado",
        "em_desenvolvimento",
        "em_colheita",
        "cancelado",
      ],
      production_mode: [
        "long_cycle",
        "hydroponics",
        "seedlings",
        "seedling_resale",
      ],
      tarefa_prioridade: ["baixa", "media", "alta", "critica"],
      tarefa_status: ["pendente", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
