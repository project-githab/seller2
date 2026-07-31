import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../service/auth.service';

/**
 * Разрешает открывать /confirm только пользователю,
 * у которого есть действующая сессия,
 * но ещё отсутствует оформленный seller.
 */
export const confirmGuard: CanActivateFn = () => {
  /**
   * Сервис проверит защищённую cookie
   * через POST /sapi/auth/session.
   */
  const authService = inject(AuthService);

  /**
   * Router создаёт безопасные перенаправления,
   * не запуская дополнительную навигацию внутри Guard.
   */
  const router = inject(Router);

  return authService.checkSession().pipe(
    map((session) => {
      /**
       * Новый пользователь без sellerId
       * должен завершить оформление на /confirm.
       */
      if (session.onboardingRequired && !session.sellerId) {
        return true;
      }

      /**
       * Уже оформленный продавец не должен
       * повторно проходить /confirm.
       */
      return router.createUrlTree(['/inventory']);
    }),

    /**
     * При отсутствии или недействительности сессии
     * возвращаем пользователя на страницу входа.
     */
    catchError(() => of(router.createUrlTree(['/']))),
  );
};
