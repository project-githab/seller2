import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { AuthErrorResponse } from '../../_core/model/auth.response';
import { AuthService } from '../../_core/service/auth.service';
import { CFooter } from '../../shared/pub/c-footer/c-footer';
import { CHeader } from '../../shared/pub/c-header/c-header';

@Component({
  selector: 'app-w-home',
  imports: [CHeader, CFooter, RouterLink, ReactiveFormsModule],
  templateUrl: './w-home.html',
  styleUrl: './w-home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col height-screen',
  },
})
export class WHome {
  /**
   * Создаёт реактивную форму входа.
   */
  private readonly formBuilder = inject(FormBuilder);

  /**
   * Выполняет вход и проверяет состояние продавца.
   */
  private readonly authService = inject(AuthService);

  /**
   * Направляет пользователя на нужную страницу
   * после успешного входа.
   */
  private readonly router = inject(Router);

  /**
   * Показывает выполнение запроса входа.
   */
  readonly isSubmitting = signal(false);

  /**
   * Сообщение об ошибке входа.
   */
  readonly errorMessage = signal('');

  /**
   * Данные формы входа продавца.
   */
  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: false,

    /**
     * Это пока только элемент текущего интерфейса.
     * Он не является настоящей CAPTCHA
     * и не отправляется в Go API.
     */
    robotConfirmed: [false, Validators.requiredTrue],
  });

  /**
   * Выполняет вход и затем проверяет,
   * завершено ли оформление продавца.
   */
  submitLogin(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const formValue = this.loginForm.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .login(formValue.email, formValue.password, formValue.rememberMe)
      .pipe(
        /**
         * После установки cookie получаем sellerId
         * и состояние обязательного оформления.
         */
        switchMap(() => this.authService.checkSession()),
      )
      .subscribe({
        next: (session) => {
          this.isSubmitting.set(false);

          if (session.onboardingRequired || !session.sellerId) {
            void this.router.navigateByUrl('/confirm');
            return;
          }

          void this.router.navigateByUrl('/inventory');
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(this.readErrorMessage(error));
        },
      });
  }

  /**
   * Извлекает безопасное сообщение Go API.
   */
  private readErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && this.isAuthErrorResponse(error.error)) {
      return error.error.error;
    }

    return 'Не удалось выполнить вход. Попробуйте позже.';
  }

  /**
   * Проверяет структуру JSON-ошибки
   * без использования небезопасного типа any.
   */
  private isAuthErrorResponse(value: unknown): value is AuthErrorResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'error' in value &&
      typeof value.error === 'string'
    );
  }
}
