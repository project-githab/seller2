import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    /**
     * Регистрирует HTTP-клиент для запросов
     * Seller Angular к Go API через /sapi.
     *
     * withFetch() поддерживает браузер
     * и серверный рендеринг Angular SSR.
     */
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
  ],
};
