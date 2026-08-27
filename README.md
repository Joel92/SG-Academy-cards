# SG Padel Academy · Session Builder

Aplicación web editable con una propuesta completa de 24 sesiones trimestrales de entrenamiento de pádel para menores.

## Qué incluye

- Modo **Planificar** para modificar objetivos, tareas, reglas y diagramas.
- Modo **Pista** para consultar una tarea cada vez durante la clase.
- Cuatro fases por sesión: activación, problema focal, oposición y partido.
- Diagramas de pista interactivos con jugadores, rivales, entrenador y zona objetivo.
- Cronómetro independiente para cada tarea.
- Adaptación automática de tiempos y consignas según edad, nivel, jugadores y pistas.
- Variante más sencilla y más exigente para cada ejercicio.
- Persistencia local, exportación e importación de la programación completa.

## Uso

Abre `index.html` con cualquier navegador moderno. No necesita instalación ni conexión a internet.

- Pulsa **Editar** para modificar cualquier texto y arrastrar los elementos de la pista.
- Los campos y las notas se guardan en el navegador al pulsar **Guardar**.
- **Exportar copia** descarga todas las modificaciones en JSON.
- **Importar** restaura una copia exportada.
- **Imprimir** genera la ficha activa en formato A4 horizontal.

Los archivos `index.html`, `styles.css`, `app.js` y `data.js` pueden editarse directamente con cualquier editor de código.

## Publicación

El repositorio incluye un workflow de GitHub Actions que publica automáticamente la rama `main` en GitHub Pages.
