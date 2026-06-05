# Visualização de Mídia no Chat (Lightbox)

Atualmente, ao clicar numa imagem ou vídeo no chat, o navegador abre o arquivo em uma nova aba. A proposta é abrir um visualizador (lightbox) por cima do próprio chat, sem sair da página.

## Comportamento

- **Imagem**: clique abre modal centralizado com a imagem em tamanho grande (até 90% da viewport), fundo escurecido. Botão de fechar (X) e fechar ao clicar fora ou pressionar `Esc`. Botão para baixar e botão para abrir em nova aba (opcional).
- **Vídeo**: clique abre o mesmo modal com `<video controls autoplay>` em tamanho grande.
- **Galeria lateral (aba "Mídia" do contato)**: ao clicar numa miniatura, mesmo lightbox abre. Setas ← → permitem navegar entre as mídias daquela conversa (imagens + vídeos).
- **Documentos e áudios**: comportamento atual mantido (download / player inline).

## Implementação Técnica

1. **Novo componente** `src/components/inbox/MediaLightbox.tsx`:
   - Usa `Dialog` do shadcn (já presente no projeto) com `DialogContent` estilizado em tela cheia/transparente.
   - Props: `items: { url: string; type: 'image' | 'video' }[]`, `initialIndex`, `open`, `onOpenChange`.
   - Listeners de teclado: `Esc` fecha, `←`/`→` navega.
   - Suporta zoom básico em imagens via `object-contain` e click-to-toggle de tamanho real.

2. **Editar `src/pages/Inbox.tsx`**:
   - Adicionar estado `const [lightbox, setLightbox] = useState<{items, index} | null>(null)`.
   - Em `MediaContent` (linhas 95–103): trocar `<img>` e `<video>` por elementos clicáveis (`onClick`) que coletam todas as mídias da conversa e abrem o lightbox no índice correto. O elemento `<video>` muda para uma thumbnail/poster clicável (em vez de `controls` inline) — opcionalmente mantém os controles e dispara o lightbox em clique no frame.
   - No `ChatBubble` (linhas 186–198): substituir o `<a target="_blank">` por `<button onClick={…}>` que abre o lightbox para a imagem detectada via conteúdo.
   - Na galeria de mídias (linha ~1791): trocar o link/abertura externa por `onClick` que abre o lightbox no índice correspondente.
   - Renderizar `<MediaLightbox …/>` uma vez no fim do JSX da página.

3. **Coleta de mídias para navegação**: helper que percorre `messages` filtrando `message_type ∈ {image, video}` e `getMediaUrl(m)`, retornando `{url, type}[]` na mesma ordem cronológica do chat. Isso alimenta as setas de navegação dentro do lightbox.

## Fora do Escopo
- Sem alterações em backend, envio, schema ou n8n.
- Sem mudança no comportamento de áudios e documentos.
