import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/services/auth.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  ngOnInit() {
    console.log('AppComponent initialized'); // Log para confirmar que se ejecuta
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email); // Log para ver el event
      if (event === 'SIGNED_IN' && localStorage.getItem('pendingRegistration')) {
        console.log('Pending registration found, completing...'); // Log antes de completar
        const result = await this.authService.completeRegistration();
        if (result.success) {
          console.log('Registro completado exitosamente.');
        } else {
          console.error('Error completando registro:', result.error);
        }
      } else {
        console.log('No pending registration or not SIGNED_IN');
      }
    });
  }
}