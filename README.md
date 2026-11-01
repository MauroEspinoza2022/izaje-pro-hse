# HAUG SSOMA Rigging Portal

SPA estática orientada a supervisión SSOMA/HSE para izajes mecánicos, aparejos, grúas móviles, izaje tándem y equipos auxiliares como tecles, winches, tirfor y gatas hidráulicas.

Nombre de la página web: Portal SSOMA - Matriz de Izaje Crítico HAUG S.A.
Nombre del proyecto: HAUG SSOMA Rigging Portal

## Estructura

- `index.html`: shell semántico del dashboard.
- `css/styles.css`: sistema visual corporativo y estilos de exportación.
- `js/app.js`: orquestación del DOM, auditoría HSE y renderizado de formularios.
- `js/modules/calculations.js`: motor matemático y reglas de negocio.

## Qué incluye

- Firma visible de autoría en header y footer.
- `meta author` con el nombre del desarrollador.
- Banner y advertencia legal en consola al iniciar la aplicación.
- Logo HAUG integrado en la cabecera y favicon SVG.
- Diseño responsive orientado a celular Android, iPhone, tablet, laptop y PC de escritorio.
- Panel de perfil trazable con nombres, DNI, correo, cargo y observaciones de mejora.
- Historial local de elaboraciones con fecha, hora, usuario, versión y escenario calculado.
- Listados de datos conocidos y presets para acelerar el ingreso en los motores de cálculo.
- Control de cambios visible con versiones y notas de publicación.
- Biblioteca documental convertida en referencia para cálculos, no en formulario de chequeo operativo.
- Motor para:
  - Grúas móviles con cálculo de utilización y alerta por viento.
  - Izaje tándem / múltiple con reparto estático por centro de gravedad.
  - Física de aparejos con tensión por ramal, ángulo máximo y factor de seguridad.
  - Umbral preventivo para equipos auxiliares de izaje.
- Botones de exportación para generar PDF local del escenario evaluado.
- Calculadora con configuraciones para grúa móvil, grúa torre, puente/pórtico, tándem,
  aparejos, tecles/winches y otros equipos.
- Memoria preliminar con carga de diseño, utilización, tensión de ramales y viento.
- Plan de izaje y checklist imprimibles mediante la función de impresión del navegador.
- Referencias de OSHA 29 CFR, NIOSH y ANSI/ASME B30. La capacidad del equipo debe
  ingresarse desde la tabla vigente del fabricante.

## Ejecución local

No requiere dependencias ni compilación.

1. Abra la carpeta del proyecto en VS Code.
2. Sirva la carpeta con un servidor estático o use la vista previa de VS Code.
3. Abra `index.html` en el navegador.

Si desea un servidor simple local, puede usar cualquier hosting estático o una extensión de live server.

La carpeta `Documentos UNACEM-20260802T032526Z-1-001` debe mantenerse como referencia documental local para los PDFs y Excel analizados; esta SPA vive fuera de esa ruta.

## Publicación en GitHub Pages

1. Cree un repositorio en GitHub y cargue estos archivos en la raíz.
2. En Settings > Pages, seleccione la rama principal y la carpeta raíz.
3. Espere la publicación y abra la URL generada.

La aplicación es completamente estática, por lo que GitHub Pages es suficiente para desplegarla sin backend.

## Alcance técnico y límites

La aplicación es una herramienta de apoyo para planificación. No reproduce tablas
propietarias ni sustituye el manual del fabricante, la evaluación del terreno, el
procedimiento del empleador, la normativa local ni la aprobación de una persona
competente. Antes de autorizar un izaje se deben verificar, como mínimo, la tabla
de carga aplicable, inspecciones, WLL de aparejos, viento, líneas eléctricas,
comunicaciones, zona de exclusión y plan de emergencia.

La base de referencia visible en el portal incluye OSHA 29 CFR 1926 Subpart CC,
29 CFR 1926.251, 29 CFR 1910.184, NIOSH y las familias ANSI/ASME B30.2, B30.3,
B30.5, B30.9, B30.10, B30.16, B30.20 y B30.26. Debe confirmarse siempre la
edición vigente y los requisitos jurisdiccionales del proyecto.

## Exportación a PDF

Cada bloque del dashboard tiene un botón `PDF` o `Descargar PDF`.

1. Abra el módulo o biblioteca que desea guardar.
2. Use el botón de impresión de esa sección.
3. El navegador descargará el archivo PDF generado por la SPA.

El reporte evaluado se genera en local con el último escenario calculado y conserva perfil, datos de entrada y dictamen técnico.

## Trazabilidad y uso

La aplicación guarda localmente el perfil del elaborador, las observaciones de mejora y el historial de cálculos para facilitar auditoría y reutilización de escenarios. Cada registro incluye fecha, hora, versión del portal, módulo calculado y resumen del dictamen.

Use el botón de un preset para cargar datos conocidos y luego ajuste los campos si necesita comparar un nuevo escenario. Si desea rehacer un caso anterior, cárguelo desde el historial y pulse recalcular.

## Nota operativa

Los documentos revisados muestran referencias de viento de 35 km/h para grúa móvil y 60 km/h para grúa torre en el permiso de izaje, mientras que el motor principal de esta SPA usa por defecto 30 km/h para la alerta preventiva pedida en el requerimiento. Si la organización decide ajustar el criterio, ese valor puede parametrizarse en `js/modules/calculations.js`.

## Autoría

Diseño lógico, matemático y arquitectónico atribuido a Ing. Mauro A. Espinoza Garay, CIP 390592.