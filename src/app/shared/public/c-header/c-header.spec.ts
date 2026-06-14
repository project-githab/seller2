import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CHeader } from './c-header';

describe('CHeader', () => {
  let component: CHeader;
  let fixture: ComponentFixture<CHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(CHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
