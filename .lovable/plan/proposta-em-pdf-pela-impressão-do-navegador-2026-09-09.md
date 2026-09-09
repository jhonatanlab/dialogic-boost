# Proposta em PDF pela impressão do navegador

Sem serviço externo e sem alteração no banco: a proposta ganha um documento visual completo que pode ser impresso ou salvo em PDF direto pelo navegador.

## O que muda para você

Na página da proposta (depois de calcular ou ao abrir uma proposta salva) aparece o botão **Imprimir / Salvar PDF**. Ele abre a janela de impressão do navegador, onde você escolhe "Salvar como PDF" e guarda o arquivo no computador ou envia para a impressora.

## O documento gerado

Segue o layout de referência, usando a personalização da empresa (logo, cores, textos):

1. **Capa** — logo, imagem de fundo, número da cotação, data, validade, nome/telefone do cliente e vendedor.
2. **Sobre nós** — textos de "Sobre", missão, visão e valores cadastrados em Personalização.
3. **Equipamentos do kit** — inversor, módulos, quantidade e potência total (kWp).
4. **Informações financeiras** — valor à vista, condição de pagamento escolhida e tabela de parcelas por banco e prazo.
5. **Geração mensal** — gráfico de barras dos 12 meses com o total anual.
6. **Investimento e retorno** — gráfico da economia acumulada ano a ano, payback e retorno em 25 anos.
7. **Tabela Fio B** — cobrança ano a ano conforme o cronograma já calculado.
8. **Responsabilidades** — texto padrão do que é da empresa e do cliente.
9. **Aceite da proposta** — campos de nome, data e assinatura, com o rodapé e contatos da empresa.

Se a proposta ainda não foi calculada, o botão fica desativado com o aviso de que é preciso calcular primeiro.

## Detalhes técnicos

- Novo componente `src/components/propostas/ProposalDocument.tsx`: recebe a proposta, o `result` do cálculo e os dados de `useSolarBranding`, e renderiza o documento em seções A4 (`w-[210mm]`, `break-inside-avoid`, `break-after-page`).
- Gráficos com `recharts` (já no projeto), com `isAnimationActive={false}` para renderizarem corretamente na impressão.
- Botão em `src/pages/propostas/NewProposal.tsx` chama `window.print()`. O documento fica montado na página com `hidden print:block`, e um wrapper `print:hidden` esconde o restante da interface na impressão.
- Regras de impressão adicionadas em `src/index.css` dentro de `@media print`: `@page { size: A4; margin: 0 }`, cores preservadas (`print-color-adjust: exact`) e ocultação do layout do painel.
- O logo e a imagem de capa do bucket privado `branding-assets` são resolvidos por URL assinada (mesmo padrão de `src/lib/mediaSrc.ts`) antes de imprimir.
- Nenhuma edge function, nenhum bucket novo, nenhuma migração: `pdf_url` e a situação da proposta continuam como estão.
