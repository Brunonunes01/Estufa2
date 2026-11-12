# Regressão dos fluxos essenciais

| Fluxo | Cenários | Resultado |
|---|---|---|
| Login | validação, credencial inválida, sessão expirada, restauração | PASS — mensagem segura e orientação, sem sucesso falso |
| Painel | fonte indisponível, ação falha, troca de tenant | PASS — degradação visível e resposta tardia descartada |
| Ciclo | campos obrigatórios, tenant, offline, gasto parcial | PASS — rejeição antecipada ou reconciliação explícita |
| Venda | clique duplo, replay, conflito, item parcial | PASS — identidade estável, sem duplicidade testada, reconciliação |
| Despesa | offline/reinício, confirmação, exclusão e baixa | PASS — estados e feedback estruturado preservados |

Os testes usam dois tenants e verificam que mensagens não incluem existência ou dados cruzados. Jornada visual em dispositivo não foi automatizada; os contratos de comportamento e a suíte completa cobrem a regressão disponível no repositório.
