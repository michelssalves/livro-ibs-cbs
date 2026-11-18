import { COLUNAS } from './colunas';

/**
 * O que cada usuário escolheu: quais campos buscar no Protheus e quais deles mostrar na tabela (o
 * Excel sai com as colunas visíveis). Fica no localStorage do navegador embutido, separado pelo
 * código do usuário do Protheus, porque a mesma máquina pode ser usada por mais de uma pessoa.
 *
 * O localStorage pode não existir ou falhar (perfil sem gravação, cota): aí a tela segue com o
 * padrão e só não lembra a escolha.
 */
export interface Preferencias {
  buscar: string[];
  visiveis: string[];
}

const VERSAO = 'v1';

export function preferenciasPadrao(): Preferencias {
  return {
    buscar: COLUNAS.filter(c => c.obrigatoria || c.padrao !== 'fora').map(c => c.campo),
    visiveis: COLUNAS.filter(c => c.padrao === 'visivel').map(c => c.campo)
  };
}

export function lerPreferencias(usuario: string): Preferencias {
  try {
    const texto = localStorage.getItem(chave(usuario));

    if (!texto) {
      return preferenciasPadrao();
    }

    const salvas = JSON.parse(texto) as Partial<Preferencias>;
    const conhecidos = new Set(COLUNAS.map(c => c.campo));
    const buscar = (salvas.buscar ?? []).filter(campo => conhecidos.has(campo));
    const visiveis = (salvas.visiveis ?? []).filter(campo => conhecidos.has(campo));

    // Obrigatórias sempre são buscadas, mesmo que a preferência salva seja de uma versão anterior.
    for (const coluna of COLUNAS.filter(c => c.obrigatoria)) {
      if (!buscar.includes(coluna.campo)) {
        buscar.push(coluna.campo);
      }
    }

    return { buscar, visiveis };
  } catch {
    return preferenciasPadrao();
  }
}

export function gravarPreferencias(usuario: string, preferencias: Preferencias): void {
  try {
    localStorage.setItem(chave(usuario), JSON.stringify(preferencias));
  } catch {
    // Sem localStorage a tela continua funcionando; só não lembra a escolha.
  }
}

export function apagarPreferencias(usuario: string): void {
  try {
    localStorage.removeItem(chave(usuario));
  } catch {
    // idem gravarPreferencias
  }
}

function chave(usuario: string): string {
  return `livro-ibs-cbs:${VERSAO}:${usuario || 'sem-usuario'}`;
}
