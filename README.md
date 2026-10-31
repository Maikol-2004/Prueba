# Michael Guzmán · CV web

CV responsive en español, inspirado en la composición editorial de Unseen Studio. Paleta de café, crema y cobre; portada con un objeto construido en CSS. Sin dependencias de ejecución, servicios de terceros ni peticiones externas.

## Ejecutar

Desde `/workspace/Prueba`, ejecuta `npm start` (requiere Python 3). También puedes abrir `index.html` directamente. El servidor usa el puerto 3000.

## Estructura y diseño

- `index.html`: contenido del CV, enlaces de contacto, filtros y desplegables nativos con `details` / `summary`.
- `style.css`: variables compartidas de color, tipografía, espaciado y movimiento; componentes `.container`, `.section-label`, `.surface`, `.pill-link`, `.text-link`, `.tag` e `.icon`; adaptaciones para tablet, móvil, movimiento reducido e impresión.
- `scenes.css`: componente visual compartido por las 12 escenas de experiencia, habilidades, formación y voluntariado. Incluye el marco luminoso, la luz de proximidad, las vistas previas y los estados de activación, foco y retorno.
- `motion.css`: movimiento de la portada y entrada de las secciones. En móvil, el foco visual de cada etapa sigue el scroll mediante variables CSS actualizadas por `requestAnimationFrame`.
- `script.js`: filtros con anuncio accesible, sección actual en navegación, progreso de lectura y de trayectoria, profundidad de portada y un único controlador para abrir y cerrar las escenas. Sin JavaScript, las vistas previas y sus detalles siguen disponibles mediante los desplegables nativos.
- `assets/Michael-Guzman-CV.pdf`: CV original descargable.
- `assets/fonts/`: dos fuentes Liberation alojadas localmente, reducidas a los caracteres latinos usados por la página y distribuidas con su licencia.

Los enlaces y desplegables conservan su comportamiento nativo y la navegación por teclado. La preferencia `prefers-reduced-motion` desactiva el desplazamiento suave, las animaciones y la inclinación de la portada, incluso si cambia con la página abierta. Los filtros conservan el estado de los desplegables.

## Interacción de las escenas

Todas comienzan cerradas. La proximidad del cursor ilumina únicamente la tarjeta más cercana, sin revelar su contenido. El foco de teclado ofrece el mismo marco. En dispositivos táctiles, la etapa cercana al centro de la pantalla recibe el foco visual; un solo toque abre el contenido. La línea de trayectoria y el año activo siguen el desplazamiento real.

Clic, Enter o Espacio activan la escena. El control Cerrar, el botón Volver a la vista previa o Escape la cierran; los dos últimos devuelven el foco al encabezado. Las transiciones de apertura (340 ms) y cierre (280 ms) pueden invertirse sin dejar alturas bloqueadas. El contenido cerrado o en proceso de cierre queda fuera de la navegación por teclado. Con movimiento reducido, la iluminación es estática y los cambios son inmediatos.

Validado en Chromium a 320, 360, 390, 520, 600, 768, 1024, 1440 y 1920 px, incluido contenido expandido; también con emulación táctil, clics rápidos, filtros durante una transición, redimensionado, teclado, cambio de movimiento reducido y JavaScript desactivado.
