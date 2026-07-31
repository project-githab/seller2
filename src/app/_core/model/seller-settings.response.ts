import type { SellerType } from './seller-onboarding';

// SellerSettingsResponse описывает настройки,
// которые Go API возвращает текущему продавцу.
//
// Идентификатор продавца намеренно отсутствует:
// Go получает его только из серверной сессии.
export interface SellerSettingsResponse {
  storeName: string;
  storeDescription: string;

  email: string;
  phone: string;

  registrationAddress: string;
  actualAddress: string;

  inn: string;
  sellerType: SellerType;

  ogrn: string;
  ogrnip: string;

  // Сервер возвращает дату и время
  // в стандартном формате ISO 8601.
  registeredAt: string;

  // Название найдено по БИК
  // в локальном справочнике Банка России.
  bankName: string;

  bankAccountNumber: string;
}
