import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WConfirm } from './w-confirm';

describe('WConfirm', () => {
  let component: WConfirm;
  let fixture: ComponentFixture<WConfirm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WConfirm],
    }).compileComponents();

    fixture = TestBed.createComponent(WConfirm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
