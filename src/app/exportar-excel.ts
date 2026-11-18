import type { LivroValor } from '../main';
import type { DefinicaoColuna } from './colunas';

/** Limite de linhas de uma aba do Excel, já descontando a linha do cabeçalho. */
const MAX_LINHAS_ABA = 1_048_575;

/** A cada quantas linhas a exportação devolve o controle à tela para atualizar o progresso. */
const LOTE_PROGRESSO = 20_000;

export type LinhaLivro = Record<string, LivroValor>;

/**
 * Gera o .xlsx numa aba "Livro IBS-CBS". Um mês de saídas tem ~110 mil itens e cabe numa aba; se
 * passar do limite do Excel, continua em "Livro IBS-CBS (2)"...
 *
 * Códigos (documento, CFOP, CST, cClassTrib...) vão como texto para não perder zero à esquerda.
 */
export async function exportarExcel(
  linhas: LinhaLivro[],
  colunas: DefinicaoColuna[],
  nomeArquivo: string,
  aoProgredir: (percentual: number) => void
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  let processadas = 0;

  for (let inicio = 0, parte = 1; inicio < Math.max(linhas.length, 1); inicio += MAX_LINHAS_ABA, parte++) {
    const nomeAba = parte === 1 ? 'Livro IBS-CBS' : `Livro IBS-CBS (${parte})`;
    const planilha = workbook.addWorksheet(nomeAba, { views: [{ state: 'frozen', ySplit: 1 }] });

    planilha.columns = colunas.map(coluna => ({
      header: coluna.titulo,
      key: coluna.campo,
      width: Math.max(coluna.titulo.length + 2, coluna.campo === 'NOME' || coluna.campo === 'DESCRICAO' ? 40 : 12),
      style: estiloDaColuna(coluna)
    }));
    planilha.getRow(1).font = { bold: true };
    planilha.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };

    for (const linha of linhas.slice(inicio, inicio + MAX_LINHAS_ABA)) {
      planilha.addRow(colunas.map(coluna => valorParaCelula(linha[coluna.campo], coluna)));
      processadas++;

      if (processadas % LOTE_PROGRESSO === 0) {
        aoProgredir(Math.round((processadas / linhas.length) * 90));
        await new Promise<void>(resolve => setTimeout(resolve));
      }
    }
  }

  aoProgredir(95);

  const buffer = await workbook.xlsx.writeBuffer();
  baixarArquivo(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }), nomeArquivo);

  aoProgredir(100);
}

function estiloDaColuna(coluna: DefinicaoColuna): { numFmt?: string } {
  switch (coluna.tipo) {
    case 'N':
      return { numFmt: '#,##0.00' };
    case 'A':
      return { numFmt: '0.00##' };
    case 'D':
      return { numFmt: 'dd/mm/yyyy' };
    default:
      return { numFmt: '@' };
  }
}

/** Data chega como DD/MM/AAAA (já formatada para a tela) e vai para o Excel como data real. */
function valorParaCelula(valor: LivroValor | undefined, coluna: DefinicaoColuna): LivroValor | Date | null {
  if (valor === undefined || valor === '') {
    return null;
  }

  if (coluna.tipo === 'D' && typeof valor === 'string' && valor.length === 10) {
    const [dia, mes, ano] = valor.split('/').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  }

  if (coluna.tipo === 'C') {
    return String(valor);
  }

  return valor;
}

function baixarArquivo(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
