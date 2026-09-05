# Corrigir fotos e arquivos que não abrem no chat

## O que está acontecendo (verificado no banco)

As mídias novas (recebidas pelo caminho nativo do WhatsApp) estão sendo guardadas de um jeito diferente das antigas:

- Mídias antigas: o endereço salvo é um link completo, e por isso abrem normalmente.
- Mídias novas: fica salvo apenas um caminho interno (ex. `empresa/conversa/ID.jpg`), sem link. A tela então tenta interpretar esse texto como se fosse a própria imagem, e o resultado é a foto quebrada e o arquivo que não abre.
- Além disso, o depósito de mídias novas está fechado ao público, então nem com o link a imagem carregaria.
- Documentos estão sendo salvos com extensão genérica `.bin` e sem o nome original, o que faz o arquivo não abrir corretamente ao baixar.

## O que será feito

1. Abrir o depósito de mídias do WhatsApp para leitura pública (igual ao que já é usado pelas mídias antigas), mantendo a gravação restrita ao sistema.
2. Passar a salvar o link completo da mídia no momento em que ela é recebida, para que fotos, vídeos, áudios e documentos abram direto no chat.
3. Guardar o nome e a extensão reais dos documentos (PDF, planilha, etc.) em vez de `.bin`, para que o download abra no programa certo.
4. Corrigir automaticamente as mídias já recebidas: converter os caminhos internos existentes em links completos, para que as conversas atuais também voltem a exibir as fotos.
5. Ajustar a tela do chat e a aba de arquivos para, por segurança, também montar o link quando encontrar um caminho interno antigo — em vez de tentar mostrar como imagem embutida.
6. Testar abrindo uma conversa com foto e um documento recente: a foto deve abrir na visualização dentro do chat e o documento deve baixar com o nome correto.

## Detalhes técnicos

- Bucket `whatsapp-media`: tornar público via `storage_update_bucket` e adicionar policy de `SELECT` público em `storage.objects`.
- `supabase/functions/webhook-evolution/index.ts`: após o upload, usar `getPublicUrl(path)` e gravar a URL absoluta em `metadata.media_url`; capturar `documentMessage.fileName` para `metadata.file_name` e derivar a extensão dele quando o mimetype for genérico (evitando `.bin`).
- Migração de dados: `UPDATE messages` nas linhas cujo `metadata->>'media_url'` não começa com `http`, prefixando `<SUPABASE_URL>/storage/v1/object/public/whatsapp-media/`.
- `src/pages/Inbox.tsx` (`resolveMediaSrc`) e `src/components/contacts/ContactDetails.tsx`: tratar valores com padrão de caminho (`uuid/uuid/arquivo.ext`) como URL pública do bucket; manter o tratamento base64 apenas para conteúdo realmente base64.
