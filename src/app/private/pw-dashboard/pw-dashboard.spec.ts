import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PwDashboard } from './pw-dashboard';

describe('PwDashboard', () => {
  let component: PwDashboard;
  let fixture: ComponentFixture<PwDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(PwDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
