# 🚀 Futuras Implementaciones - Note-Reminder

Este documento detalla las ideas y planes para la evolución de la aplicación, enfocándose en la integración con ecosistemas externos y la automatización mediante IA.

---

## 1. Integración con Google Calendar 📅
**Objetivo:** Sincronizar automáticamente las notas que tengan una alarma configurada con el calendario personal del usuario.

### Detalles:
- **Funcionalidad:** Al crear una nota con fecha y hora, se creará un evento correspondiente en Google Calendar.
- **Sincronización:** Posibilidad de actualizar o eliminar el evento si la nota cambia en la app.
- **Tecnología sugerida:** 
  - `expo-calendar` para acceso nativo al calendario del dispositivo.
  - Google Calendar API (v3) mediante OAuth2 para una integración más robusta en la nube.

---

## 2. API Propia y Conexión con Agentes Inteligentes 🤖
**Objetivo:** Convertir la aplicación en un "hub de memoria" accesible para agentes externos (como un agente de WhatsApp).

### Detalles:
- **El Concepto:** Permitir que un agente inteligente (ej. GPT-4, gemma-3) pueda leer, crear o modificar notas sin intervención manual del usuario en la interfaz.
- **Flujo de Trabajo:** 
  1. El usuario habla con su agente de WhatsApp: *"Recuérdame comprar pan a las 7 PM"*.
  2. El agente procesa la petición y hace una llamada a la API de Note-Reminder.
  3. La nota aparece instantáneamente en la pantalla principal de la aplicación.
- **Tecnología sugerida:**
  - **Backend/Cloud:** Firebase Firestore o Supabase para sincronización en tiempo real y persistencia en la nube (sustituyendo o complementando el `AsyncStorage` actual).
  - **Autenticación:** Sistema de API Keys para que solo los agentes autorizados puedan conectar.
  - **Push Notifications:** Para avisar a la app que un agente ha creado una nota nueva.

---

## 3. Notas por Voz (Voice Assistant Enhancement) 🎙️
**Objetivo:** Mejorar el flujo de creación por voz ya iniciado.

### Detalles:
- **Refinamiento:** Mejorar el parsing de fechas naturales (ej: "mañana a las ocho") usando NLP local o vía API.
- **Feedback:** Añadir confirmación sonora al completar una nota exitosamente mediante voz.

---

## 4. Implementado ✅
- **Estética Vintage (Personal Archives):** Lavado de cara completo con modo oscuro, tipografía clásica y nuevos iconos premium.
- **Integración con Google Calendar 📅:** Sincronización automática de eventos con selección de cuenta y duración personalizada.
- **Notas por Voz (Voice Assistant) 🎙️:** Flujo inteligente para dictar título, descripción y alarma en una sola sesión.
- **Alarmas de Sistema (Android):** Creación de alarmas en la aplicación de Reloj nativa de Android.
- **API Foundation (AgentAPIService):** Creada la capa de servicios para futuras integraciones programáticas con agentes de IA.

---

> [!TIP]
> Priorizar la **API/Sincronización en la nube** permitirá desbloquear el potencial de usar la app como la interfaz visual de un asistente de IA personal.
