import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwAnalytics } from './pw-analytics';

describe('PwAnalytics', () => {
  let component: PwAnalytics;
  let fixture: ComponentFixture<PwAnalytics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwAnalytics],
    }).compileComponents();

    fixture = TestBed.createComponent(PwAnalytics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
