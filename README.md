# Bull Distance Tracker — Sin IA (Plantilla)

Este proyecto está **listo para usar** sin descargar modelos ni conectarse a internet.
Funciona 100% en el navegador y usa un **seguimiento por plantilla** (template matching) en vez de una IA pesada.

## Funciones
- **Cámara** con `getUserMedia`.
- **Calibración por círculo**: clic en 4 puntos (N,E,S,O) + diámetro → homografía a metros.
- **Seguimiento sin IA**: arrastra un rectángulo sobre el toro y el sistema lo sigue por **correlación normalizada**.
- **Trayectoria en tiempo real** sobre el vídeo.
- **Distancia acumulada** en metros.
- **Exportación** a **CSV** (t, X, Y, dist) y **SVG** (círculo y recorrido en coordenadas métricas).

## Uso
1. Abre `index.html` (mejor sobre **HTTPS** para permisos de cámara en móvil).  
2. **Iniciar cámara**.
3. En el vídeo:  
   - **Calibración**: clic en 4 puntos del borde del ruedo (N, E, S, O), pon el diámetro real, y pulsa **Calcular homografía**.  
   - **Seguimiento**: **arrastra** un rectángulo sobre el toro para inicializar el tracker.  
4. Pulsa **Empezar** para registrar recorrido y distancia. **Parar** para habilitar descargas.
5. Descarga **CSV/SVG**.

## Consejos
- Cámara **fija**, buena luz y un rectángulo que incluya el toro con poco fondo mejoran el seguimiento.
- Si el toro cambia mucho de tamaño o hay oclusiones, vuelve a **arrastrar** una plantilla nueva.
- El máximo realismo de distancia depende de una **buena calibración**.

Licencia: MIT.
