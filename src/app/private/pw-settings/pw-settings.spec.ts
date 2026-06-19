import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwSettings } from './pw-settings';

describe('PwSettings', () => {
  let component: PwSettings;
  let fixture: ComponentFixture<PwSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(PwSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
