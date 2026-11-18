# livro-ibs-cbs — Livro fiscal com IBS/CBS (reforma tributária)

Relatório em **Angular 19 + PO-UI** aberto **dentro do TOTVS Protheus** por `FwCallApp`, que mostra o
livro fiscal item a item com os **tributos da reforma tributária** (CBS, IBS UF e IBS municipal) ao lado
dos tributos atuais. A comunicação com o AdvPL/TLPP é pelo **WebChannel**, sem API REST.

**Demonstração (dados fictícios):** https://michelssalves.github.io/livro-ibs-cbs/

## O que o relatório entrega

- Livro fiscal (SFT) item a item, com cliente/fornecedor, indicador de exterior, CFOP, produto e valores
- CBS e IBS (base, alíquota, valor), total IBS + CBS e a indicação de **item sem cálculo**
- Regra do tributo e regra de escrituração: **CST IBS/CBS, cClassTrib, cIndOp**, perfil de operação
- Colunas da reforma em destaque e quadro de totais separado (reforma × tributos atuais)
- Filtro mensal, por tipo de movimento, exterior, cliente/fornecedor e notas canceladas
- **O usuário escolhe quais campos buscar** (o SQL só traz o que foi pedido) e quais mostrar; a escolha
  fica salva por usuário. O Excel sai com as colunas visíveis

## Como os dados são ligados

O campo que ligaria o tributo calculado direto à regra de escrituração vem vazio, então a ligação foi
mapeada pelo dicionário e pelos dados:

```
SFT.FT_IDTRIB = F2D.F2D_IDREL    tributos calculados do item (um registro por tributo)
F2D.F2D_IDCAD = F2B.F2B_ID       regra do tributo (CBS, IBS UF, IBS municipal; perfis)
F2B.F2B_CODESC = CJ2.CJ2_CODIGO  regra de escrituração (CST e cClassTrib), versão vigente
```

## Desempenho no banco

A consulta foi medida antes de ir para produção e reescrita:

- regras (F2B/CJ2, poucas linhas) resolvidas **em memória** no AdvPL, em vez de juntadas item a item;
- nome do participante e descrição do produto em **cache por código** (centenas de códigos para
  milhares de itens por dia);
- SELECT e junções montados **só com os campos escolhidos** na tela;
- a tela pede **um dia por vez** (mensagens pequenas pelo WebChannel, com progresso e cancelamento).

Resultado medido num dia de ~5,6 mil itens: de **~390 mil para ~158 mil leituras lógicas** e de
~600 ms para ~140 ms de CPU.

## Contrato das mensagens

| Ida (`jsToAdvpl`) | Volta (`advplToJs`) |
|---|---|
| `jstoadvplPar1` (uma vez, ao conectar) | `livroIbsCbsInicio` → filial, usuário, campos disponíveis |
| `consultarDia` `{data, tipoMov, canceladas, exterior, participante, campos[]}` | `livroIbsCbsDia` → `{sucesso, campos[], linhas[][], tempos}` |
| `close` | — (tratado pelo `FwCallApp`) |

As linhas vêm como listas de valores na ordem de `campos` (mensagem menor que um objeto por linha).

## Builds

| Configuração | Uso |
|---|---|
| `protheus` | conecta o WebChannel de verdade; `npm run protheus:build` gera `Protheus/Resource/livro-ibs-cbs.app` (fora do Git) |
| `demo` | troca `src/app/modo.ts` por `modo.demo.ts` e carrega `src/demo/protheus-simulado.ts`, que responde às mesmas mensagens com dados fictícios |

```bash
npm ci
npm start                   # demonstração em http://localhost:4200
npm run protheus:build      # pacote .app para o RPO
```

---

Michel Alves · Desenvolvedor TOTVS Protheus (AdvPL/TLPP) e Angular
