# 🐂 Bull Tracker — Wizard

Aplicación web para medir la **distancia recorrida por un toro** en la plaza, usando únicamente la cámara del dispositivo móvil y visión por computador **sin necesidad de IA en servidor**.

Optimizada para **teléfonos móviles** con flujo guiado paso a paso.

---

## 🚀 Funcionalidad

1. **Inicio**
   - Pantalla de bienvenida con botón *Iniciar cámara y calibrar*.

2. **Calibración**
   - El usuario marca **4 puntos** en el borde del ruedo en orden: **Norte, Este, Sur, Oeste**.
   - Se introduce el diámetro real de la plaza (m).
   - Se calcula la **homografía** para convertir coordenadas de píxeles en coordenadas reales.

3. **Selección del toro**
   - El usuario arrastra un **rectángulo de selección** sobre el toro.
   - Se guarda una **plantilla** para hacer seguimiento cuadro a cuadro.

4. **Seguimiento**
   - El sistema sigue la posición del toro en tiempo real.
   - Se traza la trayectoria sobre el ruedo.
   - Se acumula la **distancia recorrida**.

5. **Resultados**
   - Se muestra la **distancia total** en metros.
   - Botones para exportar:
     - **CSV** con datos (tiempo, coordenadas, distancia acumulada).
     - **SVG** con trayectoria escalada al ruedo real.
     - **Compartir** (usa Web Share API en móviles).

---

## 📱 Usabilidad móvil

- Flujo tipo **wizard** paso a paso (no todos los botones a la vez).
- Botones grandes, flotantes y de colores (verde = iniciar, rojo = parar, azul = exportar, naranja = procesar).
- Mensajes en overlay guían al usuario en cada fase.
- Compatible con gestos táctiles (arrastrar rectángulo con el dedo).
- Bloqueo de gestos no deseados (scroll, pinch-zoom, selección de texto).

---

## 📦 Instalación y uso

1. **Clonar o descargar este repositorio**.
2. Subir los archivos a un hosting estático (ejemplo: **GitHub Pages**).
   - Ajustar en GitHub → *Settings* → *Pages* → *Branch: main /root*.
3. Abrir la URL desde el **móvil** y conceder permisos de cámara.

👉 Ejemplo de URL en GitHub Pages:  
`https://tuusuario.github.io/bull-tracker-wizard/`

---

## 📝 Archivos principales

- `index.html` → estructura de pantallas (wizard).
- `styles.css` → estilos móviles (modo oscuro).
- `app.js` → lógica principal (flujo paso a paso, tracking, exportaciones).
- `tracker.js` → seguimiento por plantilla.
- `homography.js` → cálculo y aplicación de homografía.
- `README.md` → este documento.

---

## ⚠️ Limitaciones

- El seguimiento usa **template matching** simple (no IA avanzada).
- Iluminación cambiante o movimiento brusco de cámara pueden reducir precisión.
- El diámetro del ruedo debe introducirse correctamente para calibración.
- No distingue automáticamente al toro: requiere selección manual.

---

## 🌟 Ideas futuras

- Integrar modelo ligero de **detección automática de toros** (YOLO-Nano u ONNX en navegador).
- Modo **demo** para cargar vídeos locales sin cámara.
- Mejorar exportación con informes en PDF.
- Añadir métricas adicionales (velocidad media, nº de vueltas, calorías estimadas 😉).

---

© 2025 — Proyecto educativo y experimental.
