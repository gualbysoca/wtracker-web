// src/utils/validationMessages.ts

/**
 * Este archivo configura escuchadores globales de eventos para traducir
 * los mensajes de validación HTML5 nativos del navegador al español.
 */

if (typeof document !== 'undefined') {
  document.addEventListener('invalid', function (e) {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!target || typeof target.setCustomValidity !== 'function') return;

    target.setCustomValidity(''); // Limpiar antes de chequear

    if (!target.validity.valid) {
      if (target.validity.valueMissing) {
        target.setCustomValidity('Por favor, completa este campo.');
      } else if (target.validity.typeMismatch) {
        if (target.type === 'email') {
          target.setCustomValidity('Por favor, introduce una dirección de correo válida.');
        } else if (target.type === 'url') {
          target.setCustomValidity('Por favor, introduce una URL válida.');
        } else {
          target.setCustomValidity('El valor introducido no es válido.');
        }
      } else if (target.validity.patternMismatch) {
        target.setCustomValidity('El formato no coincide con el solicitado.');
      } else if (target.validity.tooShort) {
        const minLen = (target as HTMLInputElement | HTMLTextAreaElement).minLength;
        target.setCustomValidity(`El texto ingresado es demasiado corto. Se requieren al menos ${minLen} caracteres.`);
      } else if (target.validity.tooLong) {
        const maxLen = (target as HTMLInputElement | HTMLTextAreaElement).maxLength;
        target.setCustomValidity(`El texto ingresado es demasiado largo. Máximo ${maxLen} caracteres.`);
      } else if (target.validity.rangeUnderflow) {
        const minVal = (target as HTMLInputElement).min;
        target.setCustomValidity(`El valor debe ser mayor o igual a ${minVal}.`);
      } else if (target.validity.rangeOverflow) {
        const maxVal = (target as HTMLInputElement).max;
        target.setCustomValidity(`El valor debe ser menor o igual a ${maxVal}.`);
      } else if (target.validity.stepMismatch) {
        target.setCustomValidity('El valor ingresado no es válido para este campo.');
      } else {
        target.setCustomValidity('Por favor, completa este campo correctamente.');
      }
    }
  }, true);

  document.addEventListener('input', function (e) {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (target && typeof target.setCustomValidity === 'function') {
      // Al escribir, limpiamos la validación customizada para permitir 
      // al navegador re-evaluar la validez en el siguiente submit.
      target.setCustomValidity('');
    }
  }, true);
}
