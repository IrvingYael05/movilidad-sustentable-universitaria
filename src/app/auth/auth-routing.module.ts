import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import LoginComponent from './components/login/login.component';
import RegisterComponent from './components/register/register.component';


export default [
  {
    path: 'register',
    loadComponent: () => RegisterComponent
  },
  {
    path: 'login',
    loadComponent: () => LoginComponent
  },
  {
    path: '**',
    redirectTo: 'login',
  }
] as Routes;