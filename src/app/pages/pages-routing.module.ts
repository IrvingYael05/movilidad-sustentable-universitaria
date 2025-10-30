import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import {ViajesComponent} from './viajes/viajes.component';

export default [
  {
    path: '',
    loadComponent: () => ViajesComponent
  },
  {
    path: '**',
    redirectTo: '',
  }
] as Routes;