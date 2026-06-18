import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpHeader } from './cp-header';

describe('CpHeader', () => {
  let component: CpHeader;
  let fixture: ComponentFixture<CpHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CpHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(CpHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
