import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';

// Sem Router de proposito, seguindo o padrao validado nas outras telas FwCallApp:
// a tela nao navega (sem <router-outlet>,
// sem rota nenhuma). O scaffold padrao do Angular CLI trazia provideRouter([])
// mesmo assim nesse projeto irmao, e isso disparava "NG04002: Cannot match
// any routes" - o Router tenta navegacao inicial no bootstrap, sem rota
// nenhuma pra casar, e o erro assincrono deixava a tela travada mesmo depois
// da resposta do WebChannel chegar. Por isso o projeto foi criado com
// `ng new --routing=false` e nenhum provider de Router e adicionado aqui.

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
