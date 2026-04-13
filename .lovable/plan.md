

## Plano: Deletar registro residual do ai_control

### Ação
Executar um DELETE na tabela `ai_control` para remover o registro do telefone `558388907220` associado ao Jhonatan França.

```sql
DELETE FROM ai_control WHERE telefone = '558388907220' AND company_id = '6e6a75bf-1766-4748-bbcd-f6c37823557f';
```

### Resultado esperado
- Tabela `ai_control` fica completamente limpa para esse número
- O n8n não mostrará mais o status "paused" em execuções futuras

### Arquivos modificados
- Nenhum arquivo de código alterado — apenas operação de dados no banco

