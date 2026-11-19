import { Directive, ElementRef, HostListener, OnDestroy, Renderer2 } from '@angular/core';

/** Quanto o mouse precisa andar para virar arraste (abaixo disso continua sendo clique). */
const LIMIAR_ARRASTE_PX = 5;

/** Elementos que mantêm o comportamento próprio: clicar neles nunca vira arraste. */
const INTERATIVOS = 'button, a, input, select, textarea, label, [role="button"], po-checkbox, .po-table-column-manager';

/**
 * Rolagem horizontal arrastando com o mouse pelo meio da tabela, além da barra de rolagem.
 *
 * Não depende da estrutura interna do po-table: no pointerdown procura, a partir do ponto
 * clicado, o primeiro elemento que rola na horizontal. Toque (celular) já rola nativo e fica de
 * fora. Clique sem movimento continua sendo clique (ordenar coluna, selecionar texto com duplo
 * clique); o clique que encerra um arraste é descartado para não ordenar a coluna sem querer.
 */
@Directive({
  selector: '[appArrastarRolagem]'
})
export class ArrastarRolagemDirective implements OnDestroy {
  private rolavel: HTMLElement | null = null;
  private inicioX = 0;
  private inicioScroll = 0;
  private arrastando = false;
  private ponteiro = -1;
  private removerOuvintes: (() => void)[] = [];

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  @HostListener('pointerdown', ['$event'])
  protected aoPressionar(evento: PointerEvent): void {
    const alvo = evento.target as HTMLElement | null;

    if (evento.pointerType !== 'mouse' || evento.button !== 0 || !alvo || alvo.closest(INTERATIVOS)) {
      return;
    }

    this.rolavel = this.acharRolavel(alvo);

    if (!this.rolavel) {
      return;
    }

    this.inicioX = evento.clientX;
    this.inicioScroll = this.rolavel.scrollLeft;
    this.arrastando = false;
    this.ponteiro = evento.pointerId;

    this.removerOuvintes = [
      this.renderer.listen('document', 'pointermove', (e: PointerEvent) => this.aoMover(e)),
      this.renderer.listen('document', 'pointerup', () => this.aoSoltar()),
      this.renderer.listen('document', 'pointercancel', () => this.aoSoltar())
    ];
  }

  ngOnDestroy(): void {
    this.encerrar();
  }

  private aoMover(evento: PointerEvent): void {
    if (!this.rolavel || evento.pointerId !== this.ponteiro) {
      return;
    }

    const deslocamento = evento.clientX - this.inicioX;

    if (!this.arrastando) {
      if (Math.abs(deslocamento) < LIMIAR_ARRASTE_PX) {
        return;
      }

      this.arrastando = true;
      this.renderer.addClass(this.host.nativeElement, 'arrastando');
      window.getSelection()?.removeAllRanges();
    }

    evento.preventDefault();
    this.rolavel.scrollLeft = this.inicioScroll - deslocamento;
  }

  private aoSoltar(): void {
    if (this.arrastando) {
      // O navegador dispara um click depois do pointerup: descarta só esse.
      const descartar = (e: Event): void => {
        e.stopPropagation();
        e.preventDefault();
      };

      window.addEventListener('click', descartar, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', descartar, { capture: true }));
    }

    this.encerrar();
  }

  private encerrar(): void {
    this.removerOuvintes.forEach(remover => remover());
    this.removerOuvintes = [];
    this.rolavel = null;
    this.arrastando = false;
    this.renderer.removeClass(this.host.nativeElement, 'arrastando');
  }

  /** Primeiro ancestral do ponto clicado, dentro da diretiva, que rola na horizontal. */
  private acharRolavel(alvo: HTMLElement): HTMLElement | null {
    const limite = this.host.nativeElement;

    for (let el: HTMLElement | null = alvo; el && el !== limite.parentElement; el = el.parentElement) {
      const overflowX = getComputedStyle(el).overflowX;

      if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
        return el;
      }
    }

    return null;
  }
}
