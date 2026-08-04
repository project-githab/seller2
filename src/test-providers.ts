import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';

/**
 * Общие зависимости тестовой среды.
 *
 * Пустая конфигурация Router позволяет создавать
 * компоненты с RouterLink и ActivatedRoute.
 *
 * Тестовый HTTP-клиент не отправляет настоящие
 * запросы к Go-серверу во время unit-тестов.
 */
const testProviders: Array<Provider | EnvironmentProviders> = [
  provideRouter([]),
  provideHttpClientTesting(),
];

export default testProviders;
