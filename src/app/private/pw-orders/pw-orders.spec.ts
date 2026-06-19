import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwOrders } from './pw-orders';

describe('PwOrders', () => {
  let component: PwOrders;
  let fixture: ComponentFixture<PwOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(PwOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
