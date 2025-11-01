import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoCompartidoComponent } from './auto-compartido.component';

describe('AutoCompartidoComponent', () => {
  let component: AutoCompartidoComponent;
  let fixture: ComponentFixture<AutoCompartidoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoCompartidoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutoCompartidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
