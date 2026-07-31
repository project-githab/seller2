import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { SellerOnboardingRequest, SellerType } from '../../_core/model/seller-onboarding';
import { CFooter } from '../../shared/pub/c-footer/c-footer';
import { CHeader } from '../../shared/pub/c-header/c-header';
import { SellerOnboardingService } from '../../_core/service/seller-onboarding.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-w-confirm',
  imports: [CFooter, CHeader, ReactiveFormsModule],
  templateUrl: './w-confirm.html',
  styleUrl: './w-confirm.css',
  host: {
    class: 'flex flex-col height-screen',
  },
})
export class WConfirm {
  /**
   * Создаёт строго типизированные
   * реактивные элементы формы.
   */
  private readonly formBuilder = inject(FormBuilder);

  /**
   * Отправляет заполненные сведения
   * в защищённый Go API.
   */
  private readonly onboardingService = inject(SellerOnboardingService);

  /**
   * После успешного оформления переводит
   * продавца в личный кабинет.
   */
  private readonly router = inject(Router);

  /**
   * Показывает выполнение запроса
   * и предотвращает повторную отправку.
   */
  readonly isSubmitting = signal(false);

  /**
   * Содержит безопасное сообщение
   * об ошибке оформления.
   */
  readonly submitError = signal<string | null>(null);

  /**
   * Типы продавцов, доступные при оформлении.
   */
  readonly sellerTypeOptions: ReadonlyArray<{
    value: SellerType;
    label: string;
  }> = [
    {
      value: 'legal_entity',
      label: 'Юридическое лицо',
    },
    {
      value: 'individual_entrepreneur',
      label: 'Индивидуальный предприниматель',
    },
    {
      value: 'individual',
      label: 'Самозанятый',
    },
  ];

  /**
   * Полная форма оформления продавца.
   *
   * Структура повторяет JSON-контракт Go API.
   */
  readonly onboardingForm = this.formBuilder.nonNullable.group({
    registration: this.formBuilder.nonNullable.group({
      sellerType: this.formBuilder.nonNullable.control<SellerType>('legal_entity', {
        validators: [Validators.required],
      }),
      isNpd: this.formBuilder.nonNullable.control(false),
      registeredName: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
      inn: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{10}$/)],
      }),
      kpp: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{9}$/)],
      }),
      ogrn: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{13}$/)],
      }),
      ogrnip: this.formBuilder.nonNullable.control(''),
      registrationAddress: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
      actualAddress: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
    }),

    contact: this.formBuilder.nonNullable.group({
      lastName: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
      firstName: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
      patronymic: this.formBuilder.nonNullable.control(''),
      jobTitle: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
      phone: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{10}$/)],
      }),
    }),

    bankAccount: this.formBuilder.nonNullable.group({
      accountNumber: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{20}$/)],
      }),
      bik: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{9}$/)],
      }),
      correspondentAccount: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{20}$/)],
      }),
    }),

    store: this.formBuilder.nonNullable.group({
      name: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required],
      }),
      description: this.formBuilder.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(1000)],
      }),
    }),

    pickupPointAddress: this.formBuilder.nonNullable.control('', {
      validators: [Validators.required],
    }),
  });

  /**
   * Возвращает выбранный организационный
   * тип продавца.
   */
  get selectedSellerType(): SellerType {
    return this.onboardingForm.controls.registration.controls.sellerType.value;
  }

  /**
   * Показывает поля юридического лица.
   */
  get isLegalEntity(): boolean {
    return this.selectedSellerType === 'legal_entity';
  }

  /**
   * Показывает поля индивидуального предпринимателя.
   */
  get isIndividualEntrepreneur(): boolean {
    return this.selectedSellerType === 'individual_entrepreneur';
  }

  /**
   * Обновляет обязательные реквизиты
   * после переключения типа продавца.
   */
  updateSellerType(): void {
    const registration = this.onboardingForm.controls.registration.controls;
    const contact = this.onboardingForm.controls.contact.controls;

    if (this.isLegalEntity) {
      registration.isNpd.setValue(false);

      this.setRequiredDigits(registration.inn, 10);
      this.setRequiredDigits(registration.kpp, 9);
      this.setRequiredDigits(registration.ogrn, 13);

      this.clearOptionalControl(registration.ogrnip);

      contact.jobTitle.setValidators([Validators.required]);
      contact.jobTitle.updateValueAndValidity();

      return;
    }

    this.setRequiredDigits(registration.inn, 12);

    this.clearOptionalControl(registration.kpp);
    this.clearOptionalControl(registration.ogrn);
    this.clearOptionalControl(contact.jobTitle);

    if (this.isIndividualEntrepreneur) {
      this.setRequiredDigits(registration.ogrnip, 15);
      return;
    }

    registration.isNpd.setValue(true);
    this.clearOptionalControl(registration.ogrnip);
  }

  /**
   * Проверяет форму и отправляет данные продавца.
   */
  submitOnboarding(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.submitError.set(null);

    if (this.onboardingForm.invalid) {
      this.onboardingForm.markAllAsTouched();
      this.submitError.set('Проверьте правильность заполнения обязательных полей.');
      return;
    }

    const formValue = this.onboardingForm.getRawValue();

    const request: SellerOnboardingRequest = {
      ...formValue,
      contact: {
        ...formValue.contact,

        // Пользователь вводит только десять цифр.
        // В Go API телефон отправляется
        // в едином формате +7XXXXXXXXXX.
        phone: `+7${formValue.contact.phone}`,
      },
    };

    this.isSubmitting.set(true);

    this.onboardingService
      .completeOnboarding(request)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/inventory']);
        },
        error: (error: unknown) => {
          this.submitError.set(this.getSubmitErrorMessage(error));
        },
      });
  }

  /**
   * Устанавливает проверку обязательного
   * цифрового значения заданной длины.
   */
  private setRequiredDigits(control: FormControl<string>, requiredLength: number): void {
    control.setValidators([
      Validators.required,
      Validators.pattern(new RegExp(`^[0-9]{${requiredLength}}$`)),
    ]);

    control.updateValueAndValidity();
  }

  /**
   * Очищает поле, которое не применяется
   * к выбранному типу продавца.
   */
  private clearOptionalControl(control: FormControl<string>): void {
    control.setValue('');
    control.clearValidators();
    control.updateValueAndValidity();
  }

  /**
   * Возвращает безопасное сообщение Go API,
   * не показывая пользователю технические детали.
   */
  private getSubmitErrorMessage(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'error' in error.error &&
      typeof error.error.error === 'string'
    ) {
      return error.error.error;
    }

    return 'Не удалось завершить оформление продавца. Попробуйте позже.';
  }

  /**
   * Открывает официальный справочник ФИАС
   * в отдельной вкладке.
   */
  openExternalSite(): void {
    window.open('https://fias.nalog.ru/', '_blank', 'noopener,noreferrer');
  }
}
