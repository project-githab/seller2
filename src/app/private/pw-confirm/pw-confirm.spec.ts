import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwConfirm } from './pw-confirm';

describe('PwConfirm', () => {
  let component: PwConfirm;
  let fixture: ComponentFixture<PwConfirm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwConfirm],
    }).compileComponents();

    fixture = TestBed.createComponent(PwConfirm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
