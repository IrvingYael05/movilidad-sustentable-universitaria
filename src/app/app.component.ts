import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [MessageService],
})

export class AppComponent {
  title = 'movilidad-sustentable-universitaria';
  constructor(private messageService: MessageService) {}

  show() {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Prueba de PrimeNG Toast',
      life: 3000,
    });
  }
}
