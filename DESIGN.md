# Sistema de design — relatórios PO-UI no Protheus

Vale para este relatório e para os irmãos (`poui-invoice-report-v2`, `aprovacoes-pendentes`).
Quem criar ou mexer numa tela da família segue isto em vez de inventar valores.

## Base

- **Tema PO-UI padrão** (`@po-ui/style`). Toda cor, espaçamento e raio sai das variáveis do tema
  (`--color-*`, `--spacing-*`, `--border-radius-*`), sempre com fallback:
  `var(--color-neutral-dark-70, #4d4d4d)`. Hex solto no componente não entra.
- **Marca:** o roxo do PO-UI troca pelo azul do Protheus, sobrescrevendo `--color-brand-01-*` no
  `styles.css` (botões, links, foco e seleção herdam):

  | Token | Valor |
  |---|---|
  | `--color-brand-01-base` | `#0c9abe` |
  | `--color-brand-01-dark` | `#0a7c99` |
  | `--color-brand-01-darker` | `#075d73` |
  | `--color-brand-01-darkest` | `#043e4d` |
  | `--color-brand-01-light` | `#74c6db` |
  | `--color-brand-01-lighter` | `#b6e1ec` |
  | `--color-brand-01-lightest` | `#e7f5f9` |

## Cores com papel

Cada cor diferente significa uma coisa. Não reaproveitar uma cor de papel para enfeite.

| Papel | Token | Onde |
|---|---|---|
| Ação, marca, título | `--color-brand-01-*` | cabeçalho, botões, totais comuns |
| Destaque do assunto da tela | próprio da tela (aqui `--cor-reforma` âmbar `#9a4d00` / fundo `#fff4e5`) | colunas e totais da reforma tributária |
| Aviso (algo pede conferência) | `--color-feedback-warning-*` | itens sem cálculo, filtro ativo, etiqueta "Não" |
| Erro | `--color-feedback-negative-*` | falha de abertura/consulta |
| Excel | `#217346` (só no ícone) | botão de exportar |

## Componentes e padrões

- **Cabeçalho:** título `1.25rem` em `brand-01-dark`, filial ao lado em cinza, "Sair" terciário à
  direita, filete de 2px `brand-01-base` embaixo.
- **Filtros:** uma linha que quebra; ações à direita (`margin-left: auto`); botões alinhados à
  base dos campos (folga `--spacing-xs` da mensagem de erro do PO-UI).
- **Totais:** cartões com filete à esquerda (3px), rótulo `0.75rem`, valor `tabular-nums`. O total
  principal da tela é maior (`1.5rem`, filete 4px). Total que é aviso vira **botão** que filtra a
  tabela.
- **Tabela:** `p-spacing="small"`, listrada, ordenável; altura acompanha a janela (mínimo 280px);
  sim/não que pede atenção vira etiqueta (`type: 'label'`, `PoTagType.Warning` no caso ruim,
  `Neutral` no normal).
- **Estado vazio:** nunca grade vazia. Antes de consultar, um quadro que diz o que a tela faz e o
  primeiro passo; consulta sem resultado, um quadro que diz o que conferir.
- **Progresso:** `po-progress` com texto do passo atual; notificação PO-UI no fim.

## Tom dos textos

Português direto, verbo no imperativo para ação ("Escolha o mês…", "Confira o código…"), termos do
fiscal (CST, cClassTrib, CFOP) sem explicar o óbvio. Sem texto de enchimento.

## Movimento

Só como resposta a uma ação: totais contam de zero até o valor em 0,4 s ao fim da consulta,
transição de 0,15 s no hover. Respeita `prefers-reduced-motion` (sem contagem). Nada decorativo.

## Não fazer

- Gradientes, sombras grandes, cantos muito arredondados, ícone em todo título.
- Estética de site de marketing (partículas, parallax) dentro do ERP.
- Cor nova sem papel nesta tabela.
