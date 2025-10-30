import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ValidationErrors,
  AbstractControl,
  Validators,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

interface RegisterForm {
  perfil: FormGroup<{
    nombre: FormControl<string | null>;
    apellido_p: FormControl<string | null>;
    apellido_m: FormControl<string | null>;
  }>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  addVehicle: FormControl<boolean | null>;
  vehiculo: FormGroup<{
    placa: FormControl<string | null>;
    marca: FormControl<string | null>;
    modelo: FormControl<string | null>;
    color: FormControl<string | null>;
    ano: FormControl<string | null>;
  }>;
}

export function institutionalEmailValidator(
  control: AbstractControl
): ValidationErrors | null {
  const email = control.value as string;
  if (email && !email.toLowerCase().endsWith('@uteq.edu.mx')) {
    return { institutionalEmail: true };
  }
  return null;
}

export function passwordValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.value as string;
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (password && !regex.test(password)) {
    return { invalidPassword: true };
  }
  return null;
}

export function lettersOnlyValidator(
  control: AbstractControl
): ValidationErrors | null {
  const value = control.value as string;
  if (value && !/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
    return { lettersOnly: true };
  }
  return null;
}

export function plateValidator(
  control: AbstractControl
): ValidationErrors | null {
  const plate = control.value as string;
  // Permite letras y números, con una longitud de 6 a 7 caracteres.
  if (plate && !/^[A-Z0-9]{6,7}$/i.test(plate)) {
    return { invalidPlate: true };
  }
  return null;
}

export function yearValidator(
  control: AbstractControl
): ValidationErrors | null {
  const year = control.value as number;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear)) {
    return { invalidYear: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CheckboxModule,
    DividerModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CommonModule,
    ToastModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export default class RegisterComponent {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _messageService = inject(MessageService);
  showVehicleForm = false;

  form = this._formBuilder.group<RegisterForm>({
    perfil: this._formBuilder.group({
      nombre: this._formBuilder.control('', [
        Validators.required,
        lettersOnlyValidator,
      ]),
      apellido_p: this._formBuilder.control('', [
        Validators.required,
        lettersOnlyValidator,
      ]),
      apellido_m: this._formBuilder.control('', [
        Validators.required,
        lettersOnlyValidator,
      ]),
    }),
    email: this._formBuilder.control('', [
      Validators.required,
      Validators.email,
      institutionalEmailValidator,
    ]),
    password: this._formBuilder.control('', [
      Validators.required,
      passwordValidator,
    ]),
    addVehicle: this._formBuilder.control(false),
    vehiculo: this._formBuilder.group({
      placa: this._formBuilder.control(''),
      marca: this._formBuilder.control(''),
      modelo: this._formBuilder.control(''),
      color: this._formBuilder.control(''),
      ano: this._formBuilder.control(''),
    }),
  });

  ngOnInit() {
    this.form.get('addVehicle')?.valueChanges.subscribe((checked) => {
      this.showVehicleForm = checked ?? false;
      const vehicleForm = this.form.get('vehiculo');

      if (checked) {
        vehicleForm
          ?.get('placa')
          ?.setValidators([Validators.required, plateValidator]);
        vehicleForm
          ?.get('marca')
          ?.setValidators([Validators.required, lettersOnlyValidator]);
        vehicleForm?.get('modelo')?.setValidators([Validators.required]);
        vehicleForm
          ?.get('color')
          ?.setValidators([Validators.required, lettersOnlyValidator]);
        vehicleForm
          ?.get('ano')
          ?.setValidators([Validators.required, yearValidator]);
      } else {
        ['placa', 'marca', 'modelo', 'color', 'ano'].forEach((controlName) => {
          vehicleForm?.get(controlName)?.clearValidators();
          vehicleForm?.get(controlName)?.setValue(null);
        });
      }

      vehicleForm?.updateValueAndValidity();
    });
  }

  private showValidationError(detail: string) {
    this._messageService.add({
      severity: 'warn',
      summary: 'Error en el formulario',
      detail: detail,
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const errors = this.form.errors;
      const controls = this.form.controls;

      if (controls.perfil.get('nombre')?.errors?.['lettersOnly']) {
        this.showValidationError('El nombre solo debe contener letras.');
      } else if (controls.perfil.get('apellido_p')?.errors?.['lettersOnly']) {
        this.showValidationError(
          'El apellido paterno solo debe contener letras.'
        );
      } else if (controls.perfil.get('apellido_m')?.errors?.['lettersOnly']) {
        this.showValidationError(
          'El apellido materno solo debe contener letras.'
        );
      } else if (controls.email?.errors?.['institutionalEmail']) {
        this.showValidationError(
          'El correo debe ser institucional (@uteq.edu.mx).'
        );
      } else if (controls.password?.errors?.['invalidPassword']) {
        this.showValidationError(
          'La contraseña no cumple con los requisitos de seguridad (8 caracteres, mayúsculas, minúsculas, números y carácteres especiales).'
        );
      } else if (controls.vehiculo.get('placa')?.errors?.['invalidPlate']) {
        this.showValidationError(
          'La placa debe tener 6 o 7 caracteres alfanuméricos.'
        );
      } else if (controls.vehiculo.get('marca')?.errors?.['lettersOnly']) {
        this.showValidationError(
          'La marca del vehículo solo debe contener letras.'
        );
      } else if (controls.vehiculo.get('ano')?.errors?.['invalidYear']) {
        this.showValidationError('El año del vehículo no es válido.');
      } else if (controls.vehiculo.get('color')?.errors?.['lettersOnly']) {
        this.showValidationError(
          'El color del vehículo solo debe contener letras.'
        );
      } else {
        this.showValidationError(
          'Por favor, completa todos los campos requeridos.'
        );
      }
      return;
    }

    this.form.disable();

    try {
      const formValue = this.form.getRawValue();

      const { data, error } = await this._authService.signUp({
        email: formValue.email ?? '',
        password: formValue.password ?? '',
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        this.form.enable();
        this._messageService.add({
          severity: 'error',
          summary: 'Error en el registro',
          detail: 'Este correo electrónico ya está registrado.',
        });
        return;
      }

      localStorage.setItem(
        'pendingRegistration',
        JSON.stringify({
          perfil: formValue.perfil,
          email: formValue.email,
          vehiculo: formValue.addVehicle ? formValue.vehiculo : null,
        })
      );

      this._messageService.add({
        severity: 'success',
        summary: '¡Registro exitoso!',
        detail:
          'Hemos enviado un correo de confirmación. Revisa tu bandeja de entrada.',
      });

      setTimeout(() => {
        this._router.navigate(['/auth/login']);
      }, 3000);
    } catch (error) {
      this.form.enable();
      this._messageService.add({
        severity: 'error',
        summary: 'Error en el registro',
        detail: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      });
      return;
    }
  }
}
