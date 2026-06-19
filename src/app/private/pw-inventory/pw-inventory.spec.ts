import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwInventory } from './pw-inventory';

describe('PwInventory', () => {
  let component: PwInventory;
  let fixture: ComponentFixture<PwInventory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwInventory],
    }).compileComponents();

    fixture = TestBed.createComponent(PwInventory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
