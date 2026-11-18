/**
 * Colunas do relatório. O `campo` é o nome que o AdvPL conhece (LivIbsCamposSft/LivIbsCamposCalc,
 * no fonte TLPP do serviço). A tela manda a lista dos campos que
 * quer buscar e o AdvPL devolve os valores nessa ordem; a ordem aqui é a de exibição.
 *
 * Tipos: C texto, N valor (2 casas), A alíquota/percentual (até 4 casas), D data (chega AAAAMMDD),
 * S sim/não (chega S/N).
 *
 * `padrao` diz como a coluna começa para quem nunca mexeu nas preferências:
 * - visivel: buscada e mostrada;
 * - oculta: buscada mas escondida (a pessoa liga pelo gerenciador de colunas da tabela);
 * - fora: não é buscada (a pessoa inclui em "Campos").
 * `obrigatoria` é sempre buscada: identifica o item (dá para esconder, não para deixar de buscar).
 */
export type TipoColuna = 'C' | 'N' | 'A' | 'D' | 'S';

export type GrupoColuna = 'Documento' | 'Participante' | 'Item' | 'Reforma tributária (IBS/CBS)' | 'Tributos atuais';

export const GRUPO_REFORMA: GrupoColuna = 'Reforma tributária (IBS/CBS)';

export interface DefinicaoColuna {
  campo: string;
  titulo: string;
  tipo: TipoColuna;
  grupo: GrupoColuna;
  padrao: 'visivel' | 'oculta' | 'fora';
  obrigatoria?: boolean;
  ajuda?: string;
}

export const COLUNAS: DefinicaoColuna[] = [
  // Documento
  { campo: 'FT_FILIAL', titulo: 'Filial', tipo: 'C', grupo: 'Documento', padrao: 'fora' },
  { campo: 'FT_TIPOMOV', titulo: 'Movimento', tipo: 'C', grupo: 'Documento', padrao: 'visivel' },
  { campo: 'FT_ENTRADA', titulo: 'Data Escrit.', tipo: 'D', grupo: 'Documento', padrao: 'visivel', obrigatoria: true },
  { campo: 'FT_EMISSAO', titulo: 'Emissão', tipo: 'D', grupo: 'Documento', padrao: 'oculta' },
  { campo: 'FT_NFISCAL', titulo: 'Documento', tipo: 'C', grupo: 'Documento', padrao: 'visivel', obrigatoria: true },
  { campo: 'FT_SERIE', titulo: 'Série', tipo: 'C', grupo: 'Documento', padrao: 'visivel', obrigatoria: true },
  { campo: 'FT_ESPECIE', titulo: 'Espécie', tipo: 'C', grupo: 'Documento', padrao: 'fora' },
  { campo: 'FT_TIPO', titulo: 'Tipo Lanç.', tipo: 'C', grupo: 'Documento', padrao: 'fora' },
  { campo: 'FT_CHVNFE', titulo: 'Chave NF-e', tipo: 'C', grupo: 'Documento', padrao: 'oculta' },
  { campo: 'FT_DTCANC', titulo: 'Data Cancel.', tipo: 'D', grupo: 'Documento', padrao: 'fora' },
  // Participante
  { campo: 'FT_CLIEFOR', titulo: 'Cli/Forn', tipo: 'C', grupo: 'Participante', padrao: 'visivel' },
  { campo: 'FT_LOJA', titulo: 'Loja', tipo: 'C', grupo: 'Participante', padrao: 'oculta' },
  { campo: 'NOME', titulo: 'Nome Cliente/Fornecedor', tipo: 'C', grupo: 'Participante', padrao: 'visivel' },
  { campo: 'EXTERIOR', titulo: 'Exterior', tipo: 'S', grupo: 'Participante', padrao: 'visivel',
    ajuda: 'Cadastro com estado EX ou tipo X' },
  { campo: 'FT_ESTADO', titulo: 'UF', tipo: 'C', grupo: 'Participante', padrao: 'visivel' },
  // Item
  { campo: 'FT_ITEM', titulo: 'Item', tipo: 'C', grupo: 'Item', padrao: 'visivel', obrigatoria: true },
  { campo: 'FT_CFOP', titulo: 'CFOP', tipo: 'C', grupo: 'Item', padrao: 'visivel' },
  { campo: 'FT_TES', titulo: 'TES', tipo: 'C', grupo: 'Item', padrao: 'oculta' },
  { campo: 'FT_PRODUTO', titulo: 'Produto', tipo: 'C', grupo: 'Item', padrao: 'visivel' },
  { campo: 'DESCRICAO', titulo: 'Descrição', tipo: 'C', grupo: 'Item', padrao: 'visivel' },
  { campo: 'FT_POSIPI', titulo: 'NCM', tipo: 'C', grupo: 'Item', padrao: 'oculta' },
  { campo: 'FT_CODISS', titulo: 'Cód. Serviço', tipo: 'C', grupo: 'Item', padrao: 'fora' },
  { campo: 'FT_VALCONT', titulo: 'Valor Contábil', tipo: 'N', grupo: 'Item', padrao: 'visivel' },
  { campo: 'FT_TOTAL', titulo: 'Valor Total', tipo: 'N', grupo: 'Item', padrao: 'fora' },
  // Reforma tributária: logo depois do valor do item, em destaque
  { campo: 'CALC_REFORMA', titulo: 'Calculou IBS/CBS', tipo: 'S', grupo: GRUPO_REFORMA, padrao: 'visivel',
    ajuda: 'Não = item sem cálculo do configurador de tributos (F2D)' },
  { campo: 'CBS_BASE', titulo: 'Base CBS', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'CBS_ALIQ', titulo: 'Alíq. CBS', tipo: 'A', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'CBS_VALOR', titulo: 'CBS', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'IBSUF_BASE', titulo: 'Base IBS UF', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'IBSUF_ALIQ', titulo: 'Alíq. IBS UF', tipo: 'A', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'IBSUF_VALOR', titulo: 'IBS UF', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'IBSMUN_BASE', titulo: 'Base IBS Mun.', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'IBSMUN_ALIQ', titulo: 'Alíq. IBS Mun.', tipo: 'A', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'IBSMUN_VALOR', titulo: 'IBS Mun.', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'IBS_TOTAL', titulo: 'IBS Total', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'oculta',
    ajuda: 'IBS UF + IBS Municipal' },
  { campo: 'IBSCBS_TOTAL', titulo: 'Total IBS + CBS', tipo: 'N', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'CJ2_CST', titulo: 'CST IBS/CBS', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'CJ2_CSTCCT', titulo: 'cClassTrib', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'visivel' },
  { campo: 'CJ2_INDOP', titulo: 'cIndOp', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'visivel',
    ajuda: 'Indicador de operação da regra de escrituração (CJ2_INDOP)' },
  { campo: 'CJ2_CCT', titulo: 'CCT IBS/CBS', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'CJ2_PERDIF', titulo: '% Diferimento', tipo: 'A', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'CJ2_DESCR', titulo: 'Regra Escrit. (descrição)', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'CODESC', titulo: 'Regra Escrit.', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'PERFOP', titulo: 'Perfil Operação', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'REGRA_CBS', titulo: 'Regra CBS', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  { campo: 'REGRA_IBS', titulo: 'Regra IBS', tipo: 'C', grupo: GRUPO_REFORMA, padrao: 'oculta' },
  // Tributos atuais
  { campo: 'FT_BASEICM', titulo: 'Base ICMS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'oculta' },
  { campo: 'FT_ALIQICM', titulo: 'Alíq. ICMS', tipo: 'A', grupo: 'Tributos atuais', padrao: 'oculta' },
  { campo: 'FT_VALICM', titulo: 'ICMS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'visivel' },
  { campo: 'FT_CLASFIS', titulo: 'Sit. Trib. ICMS', tipo: 'C', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_VALIPI', titulo: 'IPI', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_CSTPIS', titulo: 'CST PIS', tipo: 'C', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_BASEPIS', titulo: 'Base PIS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'oculta' },
  { campo: 'FT_ALIQPIS', titulo: 'Alíq. PIS', tipo: 'A', grupo: 'Tributos atuais', padrao: 'oculta' },
  { campo: 'FT_VALPIS', titulo: 'PIS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'visivel' },
  { campo: 'FT_CSTCOF', titulo: 'CST COFINS', tipo: 'C', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_BASECOF', titulo: 'Base COFINS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'oculta' },
  { campo: 'FT_ALIQCOF', titulo: 'Alíq. COFINS', tipo: 'A', grupo: 'Tributos atuais', padrao: 'oculta' },
  { campo: 'FT_VALCOF', titulo: 'COFINS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'visivel' },
  { campo: 'FT_VALCSL', titulo: 'CSLL', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_VALIRR', titulo: 'IRRF', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_VALINS', titulo: 'INSS', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_VRETPIS', titulo: 'PIS Retido', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_VRETCOF', titulo: 'COFINS Retido', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' },
  { campo: 'FT_VRETCSL', titulo: 'CSLL Retido', tipo: 'N', grupo: 'Tributos atuais', padrao: 'fora' }
];

export const GRUPOS: GrupoColuna[] = ['Documento', 'Participante', 'Item', GRUPO_REFORMA, 'Tributos atuais'];

/** Valores somados no quadro de totais. Só aparecem os que foram buscados. */
export const TOTAIS: { campo: string; titulo: string; reforma: boolean }[] = [
  { campo: 'CBS_VALOR', titulo: 'CBS', reforma: true },
  { campo: 'IBSUF_VALOR', titulo: 'IBS UF', reforma: true },
  { campo: 'IBSMUN_VALOR', titulo: 'IBS Mun.', reforma: true },
  { campo: 'IBSCBS_TOTAL', titulo: 'Total IBS + CBS', reforma: true },
  { campo: 'FT_VALCONT', titulo: 'Valor contábil', reforma: false },
  { campo: 'FT_VALICM', titulo: 'ICMS', reforma: false },
  { campo: 'FT_VALPIS', titulo: 'PIS', reforma: false },
  { campo: 'FT_VALCOF', titulo: 'COFINS', reforma: false }
];
