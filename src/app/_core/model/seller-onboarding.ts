// SellerType содержит поддерживаемые
// организационные типы продавцов.
export type SellerType = 'legal_entity' | 'individual_entrepreneur' | 'individual';

// SellerRegistrationRequest содержит
// официальные регистрационные реквизиты.
export interface SellerRegistrationRequest {
  sellerType: SellerType;
  isNpd: boolean;
  registeredName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  ogrnip: string;
  registrationAddress: string;
  actualAddress: string;
}

// SellerContactRequest содержит
// сведения о контактном лице продавца.
export interface SellerContactRequest {
  lastName: string;
  firstName: string;
  patronymic: string;
  jobTitle: string;
  phone: string;
}

// SellerBankAccountRequest содержит
// реквизиты основного счёта для выплат.
export interface SellerBankAccountRequest {
  accountNumber: string;
  bik: string;
  correspondentAccount: string;
}

// SellerStoreRequest содержит
// публичные сведения магазина.
export interface SellerStoreRequest {
  name: string;
  description: string;
}

// SellerOnboardingRequest содержит полный запрос
// оформления продавца.
//
// userId и sellerId здесь намеренно отсутствуют:
// сервер получает пользователя только из сессии.
export interface SellerOnboardingRequest {
  registration: SellerRegistrationRequest;
  contact: SellerContactRequest;
  bankAccount: SellerBankAccountRequest;
  store: SellerStoreRequest;
  pickupPointAddress: string;
}

// SellerOnboardingResponse содержит идентификатор
// полностью оформленного продавца.
export interface SellerOnboardingResponse {
  sellerId: string;
}
