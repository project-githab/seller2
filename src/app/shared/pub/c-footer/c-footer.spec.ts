import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CFooter } from './c-footer';

describe('CFooter', () => {
  let component: CFooter;
  let fixture: ComponentFixture<CFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CFooter],
    }).compileComponents();

    fixture = TestBed.createComponent(CFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
