import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthErrorResponse } from '../../_core/model/auth.response';
import { AuthService } from '../../_core/service/auth.service';
import { CFooter } from '../../shared/pub/c-footer/c-footer';
import { CHeader } from '../../shared/pub/c-header/c-header';

/**
 * Проверяет совпадение двух полей формы.
 *
 * Используется отдельно для email и пароля.
 */
function matchingFieldsValidator(
  firstControlName: string,
  secondControlName: string,
  errorName: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const firstValue = control.get(firstControlName)?.value;
    const secondValue = control.get(secondControlName)?.value;

    return firstValue === secondValue
      ? null
      : {
          [errorName]: true,
        };
  };
}

@Component({
  selector: 'app-w-registration',
  imports: [CHeader, CFooter, RouterLink, ReactiveFormsModule],
  templateUrl: './w-registration.html',
  styleUrl: './w-registration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col height-screen',
  },
})
export class WRegistration {
  /**
   * Создаёт строго типизированную
   * реактивную форму регистрации.
   */
  private readonly formBuilder = inject(FormBuilder);

  /**
   * Выполняет запрос регистрации в Go API.
   */
  private readonly authService = inject(AuthService);

  /**
   * Перенаправляет зарегистрированного пользователя
   * на обязательное оформление продавца.
   */
  private readonly router = inject(Router);

  /**
   * Показывает, что запрос регистрации выполняется.
   */
  readonly isSubmitting = signal(false);

  /**
   * Сообщение об ошибке регистрации.
   */
  readonly errorMessage = signal('');

  /**
   * Данные формы регистрации продавца.
   */
  readonly registrationForm = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      emailConfirmation: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(128)]],
      passwordConfirmation: [
        '',
        [Validators.required, Validators.minLength(15), Validators.maxLength(128)],
      ],
      rememberMe: false,

      /**
       * Это пока только элемент текущего интерфейса.
       * Он не является настоящей CAPTCHA
       * и не отправляется в Go API.
       */
      robotConfirmed: [false, Validators.requiredTrue],

      /**
       * Согласие обязательно для регистрации
       * и передаётся Go API как acceptedTerms.
       */
      acceptedTerms: [false, Validators.requiredTrue],
    },
    {
      validators: [
        matchingFieldsValidator('email', 'emailConfirmation', 'emailMismatch'),
        matchingFieldsValidator('password', 'passwordConfirmation', 'passwordMismatch'),
      ],
    },
  );

  /**
   * Отправляет корректно заполненную форму регистрации.
   */
  submitRegistration(): void {
    if (this.registrationForm.invalid || this.isSubmitting()) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const formValue = this.registrationForm.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .register(formValue.email, formValue.password, formValue.rememberMe, formValue.acceptedTerms)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);

          /**
           * После создания пользователя sellerId ещё отсутствует,
           * поэтому продолжаем оформление на /confirm.
           */
          void this.router.navigateByUrl('/confirm');
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

    return 'Не удалось завершить регистрацию. Попробуйте позже.';
  }

  /**
   * Проверяет структуру JSON-ошибки,
   * не используя небезопасный тип any.
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
