import { bootstrapApplication } from '@angular/platform-browser';
import '@totvs/twebchannel-js';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { MODO_DEMO } from './app/modo';

// Ponte WebChannel no padrao validado nas telas FwCallApp: conecta e dispara jstoadvplPar1 uma
// unica vez dentro do callback de connect() (padrao do TDN, sem retry/setInterval). A primeira
// resposta do AdvPL pode se perder de forma nao deterministica; a tela avisa por tempo limite.

export interface WebChannelStatus {
  connected: boolean;
  message: string;
  receivedType?: string;
  receivedContent?: string;
}

export type LivroValor = string | number;

export interface LivroInicioEnvelope {
  sucesso: boolean;
  mensagem: string;
  dados?: {
    filial: string;
    usuario: string;
    campos: string[];
  };
}

export interface LivroDiaEnvelope {
  sucesso: boolean;
  mensagem: string;
  data?: string;
  tipoMov?: string;
  campos?: string[];
  total?: number;
  linhas?: LivroValor[][];
  tempos?: { consulta: number; leitura: number };
}

declare global {
  interface Window {
    advplToJs?: (type: string, content: string) => void;
    jsToAdvpl?: (type: string, content: string) => boolean;
    livroIbsCbsStatus?: WebChannelStatus;
    twebchannel?: {
      advplToJs?: (type: string, content: string) => void;
      connect?: (callback: () => void) => void;
      gotConnection?: boolean;
      jsToAdvpl?: (type: string, content: string) => void;
    };
  }
}

function publicarStatus(status: WebChannelStatus): void {
  window.livroIbsCbsStatus = status;
  window.dispatchEvent(new CustomEvent<WebChannelStatus>('livroIbsCbsStatus', {
    detail: status
  }));
}

function configurarBridge(): void {
  const w = window;
  const advplAnterior = typeof w.advplToJs === 'function' ? w.advplToJs.bind(w) : undefined;

  w.advplToJs = (type: string, content: string): void => {
    publicarStatus({
      connected: w.twebchannel?.gotConnection === true,
      message: 'Mensagem recebida do AdvPL.',
      receivedType: type,
      receivedContent: content
    });

    if (advplAnterior) {
      advplAnterior(type, content);
    }
  };

  w.jsToAdvpl = (type: string, content: string): boolean => {
    const canal = w.twebchannel;

    if (typeof canal?.jsToAdvpl !== 'function') {
      publicarStatus({
        connected: false,
        message: 'WebChannel indisponível para enviar JavaScript → AdvPL.'
      });
      return false;
    }

    canal.jsToAdvpl(type, content);
    return true;
  };
}

function conectarWebChannel(): void {
  const canal = window.twebchannel;

  if (typeof canal?.connect !== 'function') {
    publicarStatus({
      connected: false,
      message: 'Pacote @totvs/twebchannel-js não expôs twebchannel.connect().'
    });
    return;
  }

  canal.advplToJs = (type: string, content: string): void => {
    window.advplToJs?.(type, content);
  };

  try {
    canal.connect((): void => {
      canal.gotConnection = true;
      publicarStatus({
        connected: true,
        message: 'WebChannel conectado. Carregando...'
      });

      // Disparo unico dentro do callback de connect() (padrao oficial TDN,
      // sem retry/setInterval) - o que provou funcionar de forma consistente
      // na investigacao original. Nao reintroduzir retry sem reler a nota.
      dispararCargaInicial();
    });
  } catch (error) {
    publicarStatus({
      connected: false,
      message: `Falha ao conectar o WebChannel: ${String(error)}`
    });
  }
}

function dispararCargaInicial(): void {
  const enviado = window.jsToAdvpl?.('jstoadvplPar1', 'content') ?? false;

  publicarStatus({
    connected: window.twebchannel?.gotConnection === true,
    message: enviado
      ? 'jstoadvplPar1 enviado (padrao oficial TDN) - aguardando resposta do AdvPL...'
      : 'Falha ao enviar jstoadvplPar1: WebChannel indisponivel.'
  });
}

configurarBridge();

if (MODO_DEMO) {
  // Chunk separado: o build do Protheus nem carrega o simulador.
  import('./demo/protheus-simulado').then(simulador => simulador.instalar());
} else {
  conectarWebChannel();
}

bootstrapApplication(AppComponent, appConfig)
  .catch((error: unknown) => console.error(error));
