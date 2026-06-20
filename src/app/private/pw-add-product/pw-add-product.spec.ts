import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwAddProduct } from './pw-add-product';

describe('PwAddProduct', () => {
  let component: PwAddProduct;
  let fixture: ComponentFixture<PwAddProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwAddProduct],
    }).compileComponents();

    fixture = TestBed.createComponent(PwAddProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
