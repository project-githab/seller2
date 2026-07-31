import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { NgOptimizedImage } from '@angular/common';
import { SellerLogoService } from '../../_core/service/seller-logo.service';
import { finalize } from 'rxjs';
import { SellerSettingsService } from '../../_core/service/seller-settings.service';
import { SellerSettingsResponse } from '../../_core/model/seller-settings.response';

@Component({
  selector: 'app-pw-settings',
  imports: [CpHeader, CpMenuList, NgOptimizedImage],
  templateUrl: './pw-settings.html',
  styleUrl: './pw-settings.css',
})
export class PwSettings implements OnInit {
  /**
   * Сервис чтения и загрузки логотипа магазина.
   */
  private readonly sellerLogoService = inject(SellerLogoService);

  /**
   * Сервис безопасно получает настройки
   * текущего магазина из Go API.
   */
  private readonly sellerSettingsService = inject(SellerSettingsService);

  /**
   * Максимальный размер исходного логотипа:
   * пять мегабайтов.
   */
  private readonly maximumLogoFileSize = 5 * 1024 * 1024;

  /**
   * Показывает выполнение загрузки логотипа.
   */
  readonly logoUploadInProgress = signal(false);

  /**
   * Содержит понятное пользователю
   * сообщение об ошибке загрузки.
   */
  readonly logoUploadError = signal('');

  /**
   * Пока персональный логотип отсутствует,
   * показываем общую иконку магазина.
   */
  readonly logoUrl = signal('/img/default-store-logo.svg');

  /**
   * Настоящее название магазина,
   * полученное из PostgreSQL через Go API.
   *
   * До завершения запроса фиктивное
   * название не показывается.
   */
  readonly storeName = signal('');

  /**
   * Полные настройки текущего магазина.
   *
   * null означает, что ответ сервера
   * ещё не получен.
   */
  readonly storeSettings = signal<SellerSettingsResponse | null>(null);

  /**
   * Возвращает правильную подпись
   * регистрационного номера продавца.
   *
   * У самозанятого регистрационного
   * номера этого типа нет.
   */
  readonly registrationNumberLabel = computed(() => {
    const sellerType = this.storeSettings()?.sellerType;

    if (sellerType === 'legal_entity') {
      return 'ОГРН';
    }

    if (sellerType === 'individual_entrepreneur') {
      return 'ОГРНИП';
    }

    return '';
  });

  /**
   * Возвращает ОГРН юридического лица
   * либо ОГРНИП индивидуального предпринимателя.
   */
  readonly registrationNumber = computed(() => {
    const settings = this.storeSettings();

    if (settings?.sellerType === 'legal_entity') {
      return settings.ogrn;
    }

    if (settings?.sellerType === 'individual_entrepreneur') {
      return settings.ogrnip;
    }

    return '';
  });

  /**
   * Преобразует дату регистрации
   * из ISO 8601 в формат ДД.ММ.ГГГГ.
   *
   * Берём календарную часть строки напрямую,
   * чтобы браузер не сдвинул день
   * при преобразовании часового пояса.
   */
  readonly registrationDate = computed(() => {
    const registeredAt = this.storeSettings()?.registeredAt;

    if (registeredAt === undefined) {
      return '';
    }

    const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(registeredAt);

    if (dateParts === null) {
      return '';
    }

    return `${dateParts[3]}.${dateParts[2]}.${dateParts[1]}`;
  });

  /**
   * После открытия страницы запрашиваем
   * текущий логотип авторизованного продавца.
   */
  ngOnInit(): void {
    this.sellerSettingsService.current().subscribe({
      next: (response) => {
        // Записываем настоящее название магазина,
        // которое Go прочитал по sellerID сессии.
        // Полный ответ понадобится всем блокам
        // страницы настроек.
        this.storeSettings.set(response);

        this.storeName.set(response.storeName);
      },
    });

    this.sellerLogoService.current().subscribe({
      next: (response) => {
        /**
         * Пустой адрес означает, что продавец
         * ещё не загрузил собственный логотип.
         */
        if (response.profileUrl !== '') {
          this.logoUrl.set(response.profileUrl);
        }
      },
    });
  }

  /**
   * Проверяет выбранное изображение и отправляет
   * его серверу сразу после выбора файла.
   */
  onLogoFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const selectedFile = inputElement.files?.item(0);

    if (selectedFile === null || selectedFile === undefined) {
      return;
    }

    this.logoUploadError.set('');

    /**
     * В браузере разрешаем только те форматы,
     * которые принимает и проверяет Go API.
     */
    if (selectedFile.type !== 'image/jpeg' && selectedFile.type !== 'image/png') {
      this.logoUploadError.set('Выберите изображение в формате JPEG или PNG.');
      inputElement.value = '';
      return;
    }

    if (selectedFile.size > this.maximumLogoFileSize) {
      this.logoUploadError.set('Размер изображения не должен превышать 5 МБ.');
      inputElement.value = '';
      return;
    }

    if (this.logoUploadInProgress()) {
      inputElement.value = '';
      return;
    }

    this.logoUploadInProgress.set(true);

    this.sellerLogoService
      .upload(selectedFile)
      .pipe(
        /**
         * Сбрасываем состояние независимо
         * от результата HTTP-запроса.
         */
        finalize(() => {
          this.logoUploadInProgress.set(false);
          inputElement.value = '';
        }),
      )
      .subscribe({
        next: (response) => {
          /**
           * Сервер возвращает новый UUID-адрес,
           * поэтому старый кеш изображения не мешает.
           */
          this.logoUrl.set(response.profileUrl);
        },
        error: () => {
          /**
           * Подробности внутренней ошибки сервера
           * пользователю не раскрываем.
           */
          this.logoUploadError.set('Не удалось загрузить логотип. Попробуйте ещё раз.');
        },
      });
  }

  colorCodeMain = signal('#FFDC26');
  colorCodeMainComplementary = signal('#2dd500');

  onColorChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    // Записываем новое HEX-значение в сигнал
    this.colorCodeMain.set(inputElement.value);
  }

  onColorChangeComplementary(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    // Записываем новое HEX-значение в сигнал
    this.colorCodeMainComplementary.set(inputElement.value);
  }
}
