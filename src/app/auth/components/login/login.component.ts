import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

// --- Módulos de PrimeNG ---
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    PasswordModule
],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup; // Declara la propiedad para el formulario

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    // Inicializa el formulario en el constructor
    this.loginForm = this.fb.group({
      // Define los controles: 'email' y 'password'
      // El valor inicial es '', y luego vienen los validadores.
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  async onSubmit() {
    // Si el formulario no es válido, no hagas nada.
    if (this.loginForm.invalid) {
      return;
    }

    // Deshabilita el formulario para evitar doble envío
    this.loginForm.disable();

    // Extrae los valores del formulario
    const email = this.loginForm.value.email;
    const password = this.loginForm.value.password;

    // Llama al servicio de autenticación
    const { user, error } = await this.authService.signInWithEmail(email, password);

    if (error) {
      console.error('Error en el login:', error.message);
      // Aquí mostraremos un mensaje de error al usuario (ej. con un Toast de PrimeNG)
      // Vuelve a habilitar el formulario si hay un error
      this.loginForm.enable();
    } else {
      console.log('¡Inicio de sesión exitoso!', user);
      // Si el login es correcto, aquí redirigiremos al dashboard principal.
    }
  }
}