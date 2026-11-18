import type { LivroValor } from '../main';
import { COLUNAS } from '../app/colunas';

/**
 * Simulador do Protheus para a demonstração (GitHub Pages): responde às mesmas mensagens do
 * WebChannel que o AdvPL responderia (abertura e um dia do livro fiscal por vez), com itens
 * fictícios gerados aqui. Respeita os filtros e devolve só os campos pedidos, como o AdvPL.
 */
export function instalar(): void {
  window.jsToAdvpl = (tipo: string, conteudo: string): boolean => {
    setTimeout(() => responder(tipo, conteudo), 120);
    return true;
  };

  responder('jstoadvplPar1', '');
}

interface PedidoDia {
  data: string;
  tipoMov: string;
  canceladas: boolean;
  exterior: string;
  participante: string;
  campos: string[];
}

function responder(tipo: string, conteudo: string): void {
  if (tipo === 'jstoadvplPar1') {
    window.advplToJs?.('livroIbsCbsInicio', JSON.stringify({
      sucesso: true,
      mensagem: '',
      dados: { filial: '01', usuario: 'demo', campos: COLUNAS.map(c => c.campo) }
    }));
  } else if (tipo === 'consultarDia') {
    const pedido = JSON.parse(conteudo) as PedidoDia;
    const itens = gerarDia(pedido);
    const linhas: LivroValor[][] = itens.map(item => pedido.campos.map(campo => item[campo] ?? ''));

    window.advplToJs?.('livroIbsCbsDia', JSON.stringify({
      sucesso: true,
      mensagem: '',
      data: pedido.data,
      tipoMov: pedido.tipoMov,
      campos: pedido.campos,
      total: linhas.length,
      linhas,
      tempos: { consulta: 0.1, leitura: 0.05 }
    }));
  }
}

const CLIENTES = [
  { nome: 'Navegação Atlântico Ltda', uf: 'SP', exterior: false },
  { nome: 'Ocean Lines Shipping Co.', uf: 'EX', exterior: true },
  { nome: 'Cooperativa Agro Sul', uf: 'PR', exterior: false },
  { nome: 'Global Freight GmbH', uf: 'EX', exterior: true },
  { nome: 'Indústria Têxtil Vale Ltda', uf: 'SC', exterior: false },
  { nome: 'Carnes do Paraguai S.A.', uf: 'EX', exterior: true },
  { nome: 'Logística Rápida Ltda', uf: 'MG', exterior: false },
  { nome: 'Auto Peças Brasil S.A.', uf: 'SP', exterior: false }
];

const FORNECEDORES = [
  { nome: 'Alfa Serviços Portuários Ltda', uf: 'PR' },
  { nome: 'Beta Manutenção Industrial Ltda', uf: 'SP' },
  { nome: 'Gama Tecnologia S.A.', uf: 'SC' }
];

const PRODUTOS = [
  { codigo: 'ARM20DRY', descricao: 'ARMAZENAGEM CONTÊINER 20 DRY' },
  { codigo: 'ARM40REEF', descricao: 'ARMAZENAGEM CONTÊINER 40 REEFER' },
  { codigo: 'MOV40EXP', descricao: 'MOVIMENTAÇÃO 40 EXPORTAÇÃO' },
  { codigo: 'MON40REEF', descricao: 'MONITORAMENTO REEFER 40' },
  { codigo: 'PES20', descricao: 'PESAGEM CONTÊINER 20' },
  { codigo: 'SCAN40', descricao: 'ESCANEAMENTO CONTÊINER 40' }
];

function gerarDia(pedido: PedidoDia): Array<Record<string, LivroValor>> {
  const data = new Date(Number(pedido.data.slice(0, 4)), Number(pedido.data.slice(4, 6)) - 1, Number(pedido.data.slice(6, 8)));
  const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
  const semente = Number(pedido.data.slice(6, 8));
  const saida = pedido.tipoMov === 'S';
  const quantidade = saida ? (fimDeSemana ? 6 : 40 + (semente % 7) * 5) : (fimDeSemana ? 0 : 5 + (semente % 4));
  const itens: Array<Record<string, LivroValor>> = [];

  for (let i = 0; i < quantidade; i++) {
    const nota = 62100000 + Number(pedido.data.slice(4, 8)) * 100 + Math.floor(i / 3);
    const parte = saida ? CLIENTES[(i + semente) % CLIENTES.length] : FORNECEDORES[(i + semente) % FORNECEDORES.length];
    const exterior = saida && 'exterior' in parte && parte.exterior;
    const codPart = String(1000 + ((i + semente) % (saida ? CLIENTES.length : FORNECEDORES.length))).padStart(6, '0');
    const produto = PRODUTOS[(i * 5 + semente) % PRODUTOS.length];
    const valor = arred(30 + ((i * 731.3 + semente * 97) % 6200));
    const calculou = (i + semente) % 37 !== 5;
    const cancelada = (i + semente) % 53 === 0;
    const cbs = calculou ? arred(valor * 0.009) : 0;
    const ibs = calculou ? arred(valor * 0.001) : 0;
    const icms = exterior ? 0 : arred(valor * 0.05);
    const pis = exterior ? 0 : arred(valor * 0.0165);
    const cofins = exterior ? 0 : arred(valor * 0.076);

    if (cancelada && !pedido.canceladas) continue;
    if (pedido.exterior === 'S' && !exterior) continue;
    if (pedido.exterior === 'N' && exterior) continue;
    if (pedido.participante && pedido.participante !== codPart) continue;

    itens.push({
      FT_FILIAL: '01', FT_TIPOMOV: pedido.tipoMov, FT_ENTRADA: pedido.data, FT_EMISSAO: pedido.data,
      FT_NFISCAL: String(nota), FT_SERIE: '1', FT_ESPECIE: saida ? 'RPS' : 'NFS', FT_ITEM: String((i % 3) + 1).padStart(2, '0'),
      FT_TIPO: 'S', FT_CLIEFOR: codPart, FT_LOJA: '01', FT_ESTADO: parte.uf,
      FT_CFOP: saida ? (exterior ? '7949' : parte.uf === 'PR' ? '5949' : '6949') : '1933',
      FT_TES: saida ? '501' : '101', FT_PRODUTO: produto.codigo, FT_POSIPI: '', FT_CODISS: '20.01',
      FT_VALCONT: valor, FT_TOTAL: valor, FT_BASEICM: exterior ? 0 : valor, FT_ALIQICM: exterior ? 0 : 5, FT_VALICM: icms,
      FT_CLASFIS: '090', FT_VALIPI: 0, FT_CSTPIS: exterior ? '08' : '01', FT_BASEPIS: exterior ? 0 : valor, FT_ALIQPIS: exterior ? 0 : 1.65,
      FT_VALPIS: pis, FT_CSTCOF: exterior ? '08' : '01', FT_BASECOF: exterior ? 0 : valor, FT_ALIQCOF: exterior ? 0 : 7.6, FT_VALCOF: cofins,
      FT_VALCSL: 0, FT_VALIRR: 0, FT_VALINS: 0, FT_VRETPIS: 0, FT_VRETCOF: 0, FT_VRETCSL: 0,
      FT_CHVNFE: '', FT_DTCANC: cancelada ? pedido.data : '',
      NOME: parte.nome, EXTERIOR: exterior ? 'S' : 'N', DESCRICAO: produto.descricao, CALC_REFORMA: calculou ? 'S' : 'N',
      CBS_BASE: calculou ? valor : 0, CBS_ALIQ: calculou ? 0.9 : 0, CBS_VALOR: cbs,
      IBSUF_BASE: calculou ? valor : 0, IBSUF_ALIQ: calculou ? 0.1 : 0, IBSUF_VALOR: ibs,
      IBSMUN_BASE: 0, IBSMUN_ALIQ: 0, IBSMUN_VALOR: 0, IBS_TOTAL: ibs, IBSCBS_TOTAL: arred(cbs + ibs),
      REGRA_CBS: calculou ? 'TR0001' : '', REGRA_IBS: calculou ? 'TR0002' : '', PERFOP: calculou ? '000051' : '',
      CODESC: calculou ? '000001' : '', CJ2_DESCR: calculou ? 'IBS/CBS - TRIBUTADA INTEGRAL' : '',
      CJ2_CST: calculou ? '000' : '', CJ2_CSTCCT: calculou ? '000001' : '', CJ2_CCT: calculou ? '001' : '',
      CJ2_INDOP: calculou ? '050201' : '', CJ2_PERDIF: 0
    });
  }

  return itens;
}

function arred(valor: number): number {
  return Math.round(valor * 100) / 100;
}
