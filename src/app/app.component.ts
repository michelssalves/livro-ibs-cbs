import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PoButtonModule,
  PoCheckboxGroupOption,
  PoFieldModule,
  PoLoadingModule,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoProgressModule,
  PoSelectOption,
  PoTableColumn,
  PoTableLiterals,
  PoTableModule,
  PoTagType
} from '@po-ui/ng-components';
import type { LivroDiaEnvelope, LivroInicioEnvelope, LivroValor, WebChannelStatus } from '../main';
import { ArrastarRolagemDirective } from './arrastar-rolagem.directive';
import { COLUNAS, DefinicaoColuna, GRUPO_REFORMA, GRUPOS, GrupoColuna, TOTAIS } from './colunas';
import { LinhaLivro, exportarExcel } from './exportar-excel';
import {
  Preferencias,
  apagarPreferencias,
  gravarPreferencias,
  lerPreferencias,
  preferenciasPadrao
} from './preferencias';

/** Tempo sem resposta da abertura da tela até avisar que o WebChannel provavelmente se perdeu. */
const ESPERA_INICIO_MS = 30_000;

/** Tempo sem resposta de um dia até desistir da consulta. */
const ESPERA_DIA_MS = 120_000;

/** Duração da contagem dos totais ao fim da consulta. */
const CONTAGEM_MS = 400;

/** Menor altura da tabela, para telas baixas não esmagarem a grade. */
const ALTURA_MINIMA_TABELA = 280;

const AMBOS = 'A';
const TODOS = 'T';

/** Uma consulta ao AdvPL: um dia num tipo de movimento, com os filtros e os campos pedidos. */
interface Pedido {
  data: string;
  tipoMov: string;
  canceladas: boolean;
  exterior: string;
  participante: string;
  campos: string[];
}

/** Medição de cada dia carregado (só console.table), para acompanhar períodos grandes. */
interface Medicao {
  data: string;
  tipoMov: string;
  linhas: number;
  tamanhoMb: number;
  consultaSeg: number;
  leituraAdvplSeg: number;
  idaVoltaSeg: number;
}

interface Total {
  titulo: string;
  valor: number;
  /** Valor mostrado durante a contagem; termina igual a `valor`. */
  exibido: number;
  formato: string;
  /** Total principal da reforma: aparece maior. */
  destaque?: boolean;
  /** Itens sem cálculo: vira aviso e filtra a tabela ao clicar. */
  alerta?: boolean;
}

interface GrupoEscolha {
  grupo: GrupoColuna;
  reforma: boolean;
  opcoes: PoCheckboxGroupOption[];
  marcados: string[];
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    PoTableModule,
    PoFieldModule,
    PoButtonModule,
    PoLoadingModule,
    PoModalModule,
    PoProgressModule,
    ArrastarRolagemDirective
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('modalCampos', { static: true }) private modalCampos?: PoModalComponent;
  private areaTabela?: ElementRef<HTMLElement>;

  /** A área só existe depois da abertura (fica dentro do *ngIf): ajusta a altura quando ela aparece. */
  @ViewChild('areaTabela') private set refAreaTabela(area: ElementRef<HTMLElement> | undefined) {
    const apareceu = area !== undefined && this.areaTabela === undefined;

    this.areaTabela = area;

    if (apareceu) {
      setTimeout(() => this.ajustarAlturaTabela());
    }
  }

  protected status: WebChannelStatus = {
    connected: false,
    message: 'Aguardando inicialização do WebChannel.'
  };

  protected iniciando = true;
  protected erroInicio: string | null = null;
  protected filial = '';

  protected readonly opcoesTipoMov: PoSelectOption[] = [
    { label: 'Saída', value: 'S' },
    { label: 'Entrada', value: 'E' },
    { label: 'Entrada e saída', value: AMBOS }
  ];
  protected readonly opcoesExterior: PoSelectOption[] = [
    // Valor vazio o po-select trata como "nada escolhido" e mostra a caixa em branco.
    { label: 'Todos', value: TODOS },
    { label: 'Só exterior', value: 'S' },
    { label: 'Só Brasil', value: 'N' }
  ];
  protected readonly opcoesCanceladas: PoSelectOption[] = [
    { label: 'Não', value: 'N' },
    { label: 'Sim', value: 'S' }
  ];

  /** Mês da consulta (MM/AAAA). O usuário fiscal confirmou que um mês por vez atende (18/11/2026). */
  protected competencia = '';
  protected tipoMov = 'S';
  protected exterior = TODOS;
  protected canceladas = 'N';
  protected participante = '';

  protected colunasTabela: PoTableColumn[] = [];
  protected readonly literaisTabela: PoTableLiterals = {
    noData: 'Nenhum item para mostrar.'
  };
  protected linhas: LinhaLivro[] = [];
  /** O que a tabela mostra: todas as linhas ou só os itens sem cálculo. */
  protected linhasExibidas: LinhaLivro[] = [];
  protected somenteSemCalculo = false;
  /** Já houve consulta concluída: distingue "ainda não consultou" de "consultou e não veio nada". */
  protected consultou = false;
  protected alturaTabela = 460;
  protected totaisReforma: Total[] = [];
  protected totaisAtuais: Total[] = [];

  protected consultando = false;
  protected exportando = false;
  protected progresso = 0;
  protected textoProgresso = '';

  protected gruposEscolha: GrupoEscolha[] = [];
  protected readonly acaoAplicarCampos: PoModalAction = {
    label: 'Aplicar',
    action: () => this.aplicarCampos()
  };
  protected readonly acaoCancelarCampos: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalCampos?.close()
  };

  private usuario = '';
  private preferencias: Preferencias = preferenciasPadrao();
  /** Campos que vieram na última consulta: a tabela só mostra o que existe nas linhas. */
  private camposCarregados: string[] = [];
  private medicoes: Medicao[] = [];
  private fila: Pedido[] = [];
  private totalPedidos = 0;
  private pedidoAtual: Pedido | null = null;
  private enviadoEm = 0;
  private cancelado = false;
  private esperaInicio?: ReturnType<typeof setTimeout>;
  private esperaDia?: ReturnType<typeof setTimeout>;
  private quadroContagem = 0;

  private readonly statusListener = (event: Event): void => {
    this.status = (event as CustomEvent<WebChannelStatus>).detail;
    this.processarMensagem();
  };

  constructor(private readonly notificacao: PoNotificationService) {}

  ngOnInit(): void {
    this.usarMesAnterior();
    this.montarColunasTabela();

    if (window.livroIbsCbsStatus) {
      this.status = window.livroIbsCbsStatus;
      this.processarMensagem();
    }

    window.addEventListener('livroIbsCbsStatus', this.statusListener);

    // A primeira resposta do AdvPL às vezes não chega (ver main.ts). Sem este aviso a tela
    // ficaria em "Carregando..." para sempre.
    this.esperaInicio = setTimeout(() => {
      if (this.iniciando) {
        this.iniciando = false;
        this.erroInicio = 'O Protheus não respondeu à abertura da tela. Feche a tela e abra novamente.';
      }
    }, ESPERA_INICIO_MS);
  }

  ngOnDestroy(): void {
    window.removeEventListener('livroIbsCbsStatus', this.statusListener);
    clearTimeout(this.esperaInicio);
    clearTimeout(this.esperaDia);
    cancelAnimationFrame(this.quadroContagem);
  }

  /** A tabela ocupa o que sobra da janela abaixo dela (o po-table precisa da altura em px). */
  @HostListener('window:resize')
  protected ajustarAlturaTabela(): void {
    const topo = this.areaTabela?.nativeElement.getBoundingClientRect().top;

    if (topo === undefined) {
      return;
    }

    this.alturaTabela = Math.max(ALTURA_MINIMA_TABELA, Math.floor(window.innerHeight - topo - 16));

    // O p-height é só o corpo: cabeçalho e engrenagem do po-table vêm por cima. Depois de
    // desenhar, desconta o que passou da janela.
    setTimeout(() => {
      const sobra = document.documentElement.scrollHeight - window.innerHeight;

      if (sobra > 0) {
        this.alturaTabela = Math.max(ALTURA_MINIMA_TABELA, this.alturaTabela - sobra);
      }
    });
  }

  /** Clique no total "Itens sem cálculo": alterna entre todas as linhas e só esses itens. */
  protected alternarSemCalculo(): void {
    this.somenteSemCalculo = !this.somenteSemCalculo;
    this.aplicarFiltroTabela();
    // A faixa "Mostrando só..." entra ou sai acima da tabela.
    setTimeout(() => this.ajustarAlturaTabela());
  }

  protected usarMesAnterior(): void {
    const hoje = new Date();
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

    this.competencia = `${String(anterior.getMonth() + 1).padStart(2, '0')}/${anterior.getFullYear()}`;
  }

  protected consultar(): void {
    const aaaamm = this.paraAaaaMm(this.competencia);

    if (!aaaamm) {
      this.notificacao.warning('Informe o mês no formato MM/AAAA.');
      return;
    }

    // Um pedido por dia do mês: cada consulta ao banco fica pequena (~5 mil itens num dia útil).
    const dias = this.diasDoMes(aaaamm);

    const participante = this.participante.trim().toUpperCase();

    if (participante && !/^[0-9A-Z]{1,6}$/.test(participante)) {
      this.notificacao.warning('O código do cliente/fornecedor tem até 6 letras ou números.');
      return;
    }

    const tipos = this.tipoMov === AMBOS ? ['S', 'E'] : [this.tipoMov];
    const campos = COLUNAS.filter(c => this.preferencias.buscar.includes(c.campo)).map(c => c.campo);

    this.fila = [];

    for (const data of dias) {
      for (const tipoMov of tipos) {
        this.fila.push({
          data,
          tipoMov,
          canceladas: this.canceladas === 'S',
          exterior: this.exterior === TODOS ? '' : this.exterior,
          participante,
          campos
        });
      }
    }

    this.linhas = [];
    this.linhasExibidas = [];
    this.somenteSemCalculo = false;
    this.totaisReforma = [];
    this.totaisAtuais = [];
    this.medicoes = [];
    this.camposCarregados = campos;
    this.montarColunasTabela();
    this.totalPedidos = this.fila.length;
    this.cancelado = false;
    this.consultando = true;
    this.progresso = 0;

    this.enviarProximo();
  }

  protected cancelar(): void {
    this.cancelado = true;
    this.textoProgresso = 'Cancelando depois do dia em andamento...';
  }

  protected async exportar(): Promise<void> {
    const colunas = COLUNAS.filter(c => this.camposCarregados.includes(c.campo)
      && this.preferencias.visiveis.includes(c.campo));
    const nomeArquivo = `livro-ibs-cbs_${this.tipoMov}_${this.paraAaaaMm(this.competencia)}.xlsx`;

    this.exportando = true;
    this.progresso = 0;
    this.textoProgresso = `Gerando Excel com ${this.linhasExibidas.length.toLocaleString('pt-BR')} linhas...`;

    try {
      const inicio = performance.now();

      // O Excel sai com o que a tabela mostra: com o filtro de itens sem cálculo, só eles.
      await exportarExcel(this.linhasExibidas, colunas, nomeArquivo, percentual => {
        this.progresso = percentual;
      });

      const segundos = ((performance.now() - inicio) / 1000).toFixed(1);
      this.notificacao.success(`Excel gerado em ${segundos}s.`);
    } catch (erro) {
      console.error('[livro-ibs-cbs] falha ao gerar o Excel', erro);
      this.notificacao.error('Não foi possível gerar o Excel. Tente um período menor.');
    } finally {
      this.exportando = false;
      this.textoProgresso = '';
    }
  }

  /** Gerenciador de colunas da tabela: guarda o que ficou visível (é o que vai para o Excel). */
  protected aoMudarColunasVisiveis(visiveis: string[]): void {
    const foraDaTabela = this.preferencias.visiveis.filter(campo => !this.camposCarregados.includes(campo));

    this.preferencias = { ...this.preferencias, visiveis: [...foraDaTabela, ...visiveis] };
    gravarPreferencias(this.usuario, this.preferencias);
  }

  protected abrirCampos(): void {
    this.gruposEscolha = GRUPOS.map(grupo => {
      const colunas = COLUNAS.filter(c => c.grupo === grupo);

      return {
        grupo,
        reforma: grupo === GRUPO_REFORMA,
        opcoes: colunas.map(c => ({ label: c.titulo, value: c.campo, disabled: c.obrigatoria === true })),
        marcados: colunas.filter(c => this.preferencias.buscar.includes(c.campo)).map(c => c.campo)
      };
    });

    this.modalCampos?.open();
  }

  protected marcarGrupo(escolha: GrupoEscolha, marcar: boolean): void {
    escolha.marcados = COLUNAS
      .filter(c => c.grupo === escolha.grupo && (marcar || c.obrigatoria))
      .map(c => c.campo);
  }

  protected restaurarPadrao(): void {
    apagarPreferencias(this.usuario);
    this.preferencias = preferenciasPadrao();
    this.montarColunasTabela();
    this.modalCampos?.close();
    this.notificacao.information('Campos e colunas voltaram ao padrão. Clique em Consultar para buscar de novo.');
  }

  /** Fecha a tela pelo FwCallApp (tipo "close", tratado pelo próprio framework). */
  protected sair(): void {
    const enviado = window.jsToAdvpl?.('close', '') ?? false;

    if (!enviado) {
      this.notificacao.error('WebChannel indisponível para fechar a tela.');
    }
  }

  protected get qtdCamposBuscados(): number {
    return this.preferencias.buscar.length;
  }

  private aplicarCampos(): void {
    const buscar = this.gruposEscolha.flatMap(escolha => escolha.marcados);
    const novos = buscar.filter(campo => !this.preferencias.buscar.includes(campo));

    // Campo que passa a ser buscado entra visível; quem não quiser vê-lo esconde na tabela.
    this.preferencias = {
      buscar,
      visiveis: [...new Set([...this.preferencias.visiveis, ...novos])]
    };
    gravarPreferencias(this.usuario, this.preferencias);
    this.modalCampos?.close();

    if (novos.length > 0 && this.linhas.length > 0) {
      this.notificacao.information('Campos novos escolhidos. Clique em Consultar para buscá-los.');
    }

    // Campo retirado some da tabela na hora; campo novo só aparece depois de consultar.
    this.camposCarregados = this.camposCarregados.filter(campo => buscar.includes(campo));
    this.montarColunasTabela();
    this.calcularTotais(false);

    if (!this.camposCarregados.includes('CALC_REFORMA')) {
      this.somenteSemCalculo = false;
    }

    this.aplicarFiltroTabela();
  }

  private aplicarFiltroTabela(): void {
    this.linhasExibidas = this.somenteSemCalculo
      ? this.linhas.filter(linha => linha['CALC_REFORMA'] === 'Não')
      : this.linhas;
  }

  private montarColunasTabela(): void {
    const disponiveis = this.linhas.length > 0 || this.consultando ? this.camposCarregados : this.preferencias.buscar;

    this.colunasTabela = COLUNAS
      .filter(c => disponiveis.includes(c.campo))
      .map(c => this.paraColunaTabela(c));
  }

  private enviarProximo(): void {
    const proximo = this.fila.shift();

    if (!proximo || this.cancelado) {
      this.finalizarConsulta();
      return;
    }

    this.pedidoAtual = proximo;
    this.enviadoEm = performance.now();
    this.textoProgresso = `${proximo.tipoMov === 'S' ? 'Saídas' : 'Entradas'} de ${this.formatarData(proximo.data)} `
      + `(${this.totalPedidos - this.fila.length} de ${this.totalPedidos}) - `
      + `${this.linhas.length.toLocaleString('pt-BR')} itens até agora`;

    const enviado = window.jsToAdvpl?.('consultarDia', JSON.stringify(proximo)) ?? false;

    if (!enviado) {
      this.notificacao.error('WebChannel indisponível para consultar o livro fiscal.');
      this.finalizarConsulta();
      return;
    }

    clearTimeout(this.esperaDia);
    this.esperaDia = setTimeout(() => {
      this.notificacao.error(
        `O Protheus não respondeu o dia ${this.formatarData(proximo.data)}. `
        + 'Os dados carregados até aqui foram mantidos.'
      );
      this.finalizarConsulta();
    }, ESPERA_DIA_MS);
  }

  private finalizarConsulta(): void {
    clearTimeout(this.esperaDia);

    const interrompida = this.cancelado || this.fila.length > 0;

    this.consultando = false;
    this.pedidoAtual = null;
    this.fila = [];
    this.textoProgresso = '';
    this.progresso = 100;
    this.linhas = [...this.linhas];
    this.consultou = true;
    this.aplicarFiltroTabela();
    this.montarColunasTabela();
    this.calcularTotais(true);
    // Os totais acabaram de aparecer acima da tabela: recalcula depois que a tela se desenhar.
    setTimeout(() => this.ajustarAlturaTabela());

    if (interrompida) {
      this.notificacao.warning(`Consulta interrompida com ${this.linhas.length.toLocaleString('pt-BR')} itens.`);
    } else {
      this.notificacao.success(`${this.linhas.length.toLocaleString('pt-BR')} itens carregados.`);
    }

    console.table(this.medicoes);
  }

  private processarMensagem(): void {
    if (!this.status.receivedContent) {
      return;
    }

    switch (this.status.receivedType) {
      case 'livroIbsCbsInicio':
        this.processarInicio(this.status.receivedContent);
        break;
      case 'livroIbsCbsDia':
        this.processarDia(this.status.receivedContent);
        break;
      default:
        break;
    }
  }

  private processarInicio(conteudo: string): void {
    clearTimeout(this.esperaInicio);
    this.iniciando = false;

    try {
      const envelope = JSON.parse(conteudo) as LivroInicioEnvelope;

      if (!envelope.sucesso || !envelope.dados) {
        this.erroInicio = envelope.mensagem || 'O AdvPL não devolveu a lista de campos.';
        return;
      }

      const faltando = COLUNAS.filter(coluna => !envelope.dados?.campos.includes(coluna.campo));

      // Tela e AdvPL fora de sincronia (um compilado sem o outro): melhor parar do que pedir
      // campo que o fonte não conhece.
      if (faltando.length > 0) {
        this.erroInicio = `O Protheus não conhece as colunas ${faltando.map(c => c.campo).join(', ')}. `
          + 'A versão da tela e a do fonte no RPO estão diferentes.';
        return;
      }

      this.erroInicio = null;
      this.filial = envelope.dados.filial;
      this.usuario = envelope.dados.usuario;
      this.preferencias = lerPreferencias(this.usuario);
      this.montarColunasTabela();
    } catch {
      this.erroInicio = 'Resposta do AdvPL não é um JSON válido.';
    }
  }

  private processarDia(conteudo: string): void {
    const recebidoEm = performance.now();
    const pedido = this.pedidoAtual;

    clearTimeout(this.esperaDia);

    // Resposta que chegou depois do tempo limite: a consulta já foi encerrada.
    if (!pedido || !this.consultando) {
      return;
    }

    try {
      const envelope = JSON.parse(conteudo) as LivroDiaEnvelope;

      if (!envelope.sucesso) {
        this.notificacao.error(envelope.mensagem || 'O AdvPL não devolveu os dados do dia.');
        this.finalizarConsulta();
        return;
      }

      const campos = envelope.campos ?? pedido.campos;

      for (const valores of envelope.linhas ?? []) {
        this.linhas.push(this.paraLinha(campos, valores));
      }

      this.medicoes.push({
        data: pedido.data,
        tipoMov: pedido.tipoMov,
        linhas: envelope.total ?? 0,
        tamanhoMb: Number((conteudo.length / 1_048_576).toFixed(2)),
        consultaSeg: envelope.tempos?.consulta ?? 0,
        leituraAdvplSeg: envelope.tempos?.leitura ?? 0,
        idaVoltaSeg: Number(((recebidoEm - this.enviadoEm) / 1000).toFixed(1))
      });
      this.progresso = Math.round(((this.totalPedidos - this.fila.length) / this.totalPedidos) * 100);
    } catch {
      this.notificacao.error('Resposta do AdvPL não é um JSON válido.');
      this.finalizarConsulta();
      return;
    }

    this.enviarProximo();
  }

  private paraLinha(campos: string[], valores: LivroValor[]): LinhaLivro {
    const linha: LinhaLivro = {};

    campos.forEach((campo, indice) => {
      linha[campo] = valores[indice] ?? '';
    });

    for (const coluna of COLUNAS) {
      if (!(coluna.campo in linha)) {
        continue;
      }

      if (coluna.tipo === 'D') {
        linha[coluna.campo] = this.formatarData(String(linha[coluna.campo] ?? ''));
      } else if (coluna.tipo === 'N' || coluna.tipo === 'A') {
        // Um único valor não numérico numa coluna "number" quebra a renderização do po-table
        // inteiro (NG02100 no DecimalPipe): garante número aqui.
        linha[coluna.campo] = Number(linha[coluna.campo]) || 0;
      } else if (coluna.tipo === 'S') {
        linha[coluna.campo] = linha[coluna.campo] === 'S' ? 'Sim' : 'Não';
      }
    }

    if ('FT_TIPOMOV' in linha) {
      linha['FT_TIPOMOV'] = linha['FT_TIPOMOV'] === 'S' ? 'Saída' : 'Entrada';
    }

    return linha;
  }

  /** Totais sempre sobre todas as linhas (não sobre o filtro de itens sem cálculo). */
  private calcularTotais(contar: boolean): void {
    const somar = (campo: string): number =>
      this.linhas.reduce((soma, linha) => soma + (Number(linha[campo]) || 0), 0);
    const buscados = TOTAIS.filter(t => this.camposCarregados.includes(t.campo));
    const total = (titulo: string, valor: number, formato: string): Total =>
      ({ titulo, valor, exibido: valor, formato });

    this.totaisReforma = buscados.filter(t => t.reforma)
      .map(t => ({ ...total(t.titulo, somar(t.campo), '1.2-2'), destaque: t.campo === 'IBSCBS_TOTAL' }));
    this.totaisAtuais = [
      total('Itens', this.linhas.length, '1.0-0'),
      ...buscados.filter(t => !t.reforma).map(t => total(t.titulo, somar(t.campo), '1.2-2'))
    ];

    if (this.camposCarregados.includes('CALC_REFORMA')) {
      this.totaisReforma.push({
        ...total('Itens sem cálculo', this.linhas.filter(linha => linha['CALC_REFORMA'] === 'Não').length, '1.0-0'),
        alerta: true
      });
    }

    if (contar) {
      this.contarTotais();
    }
  }

  /** Os totais sobem de zero até o valor. Quem pediu menos movimento no sistema vê o valor direto. */
  private contarTotais(): void {
    const totais = [...this.totaisReforma, ...this.totaisAtuais];

    cancelAnimationFrame(this.quadroContagem);

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const inicio = performance.now();
    const passo = (agora: number): void => {
      const fracao = Math.min(1, (agora - inicio) / CONTAGEM_MS);
      // Desacelera no fim (ease-out cúbico).
      const suave = 1 - Math.pow(1 - fracao, 3);

      for (const t of totais) {
        t.exibido = fracao < 1 ? t.valor * suave : t.valor;
      }

      if (fracao < 1) {
        this.quadroContagem = requestAnimationFrame(passo);
      }
    };

    for (const t of totais) {
      t.exibido = 0;
    }

    this.quadroContagem = requestAnimationFrame(passo);
  }

  private paraColunaTabela(coluna: DefinicaoColuna): PoTableColumn {
    const reforma = coluna.grupo === GRUPO_REFORMA;
    const base: PoTableColumn = {
      property: coluna.campo,
      // O po-table aplica a classe po-text-<color> no conteúdo: po-text-reforma está no styles.css.
      label: coluna.titulo,
      visible: this.preferencias.visiveis.includes(coluna.campo),
      color: reforma ? 'reforma' : undefined,
      tooltip: coluna.ajuda
    };

    // "Não" é o caso que pede atenção: etiqueta de aviso; "Sim" fica discreto.
    if (coluna.campo === 'CALC_REFORMA') {
      return {
        ...base,
        // Sem a classe âmbar da reforma: ela pinta o texto da célula por cima da etiqueta.
        color: undefined,
        type: 'label',
        labels: [
          { value: 'Sim', label: 'Sim', type: PoTagType.Neutral },
          { value: 'Não', label: 'Não', type: PoTagType.Warning, tooltip: coluna.ajuda }
        ]
      };
    }

    switch (coluna.tipo) {
      case 'N':
        return { ...base, type: 'number', format: '1.2-2' };
      case 'A':
        return { ...base, type: 'number', format: '1.2-4' };
      default:
        return { ...base, type: 'string' };
    }
  }

  /** AAAAMMDD -> DD/MM/AAAA; vazio continua vazio. */
  private formatarData(valor: string): string {
    if (valor.length !== 8) {
      return valor;
    }

    return `${valor.substring(6, 8)}/${valor.substring(4, 6)}/${valor.substring(0, 4)}`;
  }

  /** MM/AAAA (ou MMAAAA, como a máscara pode devolver) -> AAAAMM; inválido devolve ''. */
  private paraAaaaMm(valor: string): string {
    const digitos = (valor ?? '').replace(/\D/g, '');

    if (digitos.length !== 6) {
      return '';
    }

    const mes = Number(digitos.substring(0, 2));

    if (mes < 1 || mes > 12) {
      return '';
    }

    return `${digitos.substring(2, 6)}${digitos.substring(0, 2)}`;
  }

  /** Todos os dias do mês AAAAMM, como AAAAMMDD. */
  private diasDoMes(aaaamm: string): string[] {
    const ano = Number(aaaamm.substring(0, 4));
    const mes = Number(aaaamm.substring(4, 6));
    const ultimoDia = new Date(ano, mes, 0).getDate();

    return Array.from({ length: ultimoDia }, (_, i) => `${aaaamm}${String(i + 1).padStart(2, '0')}`);
  }
}
