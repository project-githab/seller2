import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../service/auth.service';

/**
 * Защищает личные страницы продавца.
 *
 * Доступ разрешается только пользователю
 * с действующей сессией и существующим sellerId.
 */
export const sellerGuard: CanActivateFn = () => {
  /**
   * Проверяет cookie серверной сессии.
   */
  const authService = inject(AuthService);

  /**
   * Создаёт перенаправления без запуска
   * дополнительной навигации внутри Guard.
   */
  const router = inject(Router);

  return authService.checkSession().pipe(
    map((session) => {
      /**
       * Пользователь без sellerId обязан
       * сначала завершить оформление продавца.
       */
      if (session.onboardingRequired || !session.sellerId) {
        return router.createUrlTree(['/confirm']);
      }

      /**
       * Действующий продавец получает доступ
       * к закрытой странице.
       */
      return true;
    }),

    /**
     * Пользователь без действующей сессии
     * возвращается на страницу входа.
     */
    catchError(() => of(router.createUrlTree(['/']))),
  );
};
