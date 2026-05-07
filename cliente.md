# Identidad Visual: Agro Yánez

Este documento detalla los elementos visuales extraídos para la construcción de la presencia digital de Agro Yánez. La identidad refleja un enfoque agrícola, profesional y enérgico.

## 1. Análisis del Logotipo
El logotipo se compone de un emblema ovalado con una fuerte presencia tipográfica y simbólica.

- **Símbolo:** Una letra 'A' estilizada que se transforma en una hoja verde en su trazo ascendente derecho, simbolizando crecimiento, naturaleza y el sector agropecuario.
- **Forma:** Un óvalo rojo de fondo con borde negro, que aporta estabilidad y destaca el dinamismo de la marca.
- **Estilo:** Efecto de relieve (3D) con biselado, lo que sugiere una marca establecida y tangible.

## 2. Paleta de Colores (Códigos Hex)
Basado en la guía de estilo proporcionada, se han identificado los siguientes valores para uso en desarrollo web (CSS/Tailwind):

### Colores Principales
- **Rojo Vibrante (`#FF0000`):** Color de fondo del logo. Ideal para Call to Actions (CTAs) y elementos de urgencia o potencia.
- **Verde Lima (`#32CD32`):** Color de la hoja y la 'A'. Representa vitalidad, frescura y productos orgánicos.
- **Blanco Puro (`#FFFFFF`):** Utilizado para el borde de la tipografía. Color esencial para fondos de sección y legibilidad.

### Colores Secundarios y de Soporte
- **Negro / Carbón (`#000000`):** Para textos principales y bordes definidos.
- **Verde Bosque (`#006400`):** Excelente para pies de página (footers) o encabezados secundarios.
- **Verde Oliva / Musgo (`#556B2F`):** Color tierra para fondos suaves o iconos.
- **Naranja Intenso (`#FF8C00`):** Color de acento para destacar ofertas o varietales de productos.

## 3. Guía de Estilos para Web (Propuesta)

### Tipografía
Se recomienda el uso de fuentes Sans-Serif modernas para contrastar con el estilo clásico del logo:
- **Títulos:** Montserrat o Roboto (Bold).
- **Cuerpo:** Open Sans o Inter (Regular).

### Componentes de Interfaz (UI)
- **Botones Primarios:** Fondo `#FF0000` con texto blanco y bordes redondeados (estilo cápsula como el logo).
- **Botones Secundarios:** Fondo `#32CD32` o bordes de este color.
- **Tarjetas de Producto:** Fondo blanco con bordes sutiles en `#556B2F`.

## 4. Aplicación Sugerida
- **Header:** Fondo blanco con el logotipo a la izquierda y menú en `#000000`. Al hacer hover, los enlaces cambian a `#32CD32`.
- **Sección Hero:** Imagen de campo de alta calidad con un overlay sutil y botones en `#FF0000`.
- **Iconografía:** Líneas finas en `#006400` para representar servicios agrícolas.

---
*Documento generado para el equipo de desarrollo y diseño web de Agro Yánez.*


#instrucciones para creación de página web
## arquitectura de proyecto
diseñar el arbol de archivos de forma profesional y con direcciones relativas para que sea 100% compatible con cloudflare-pages.
Estructura esperada:

cliente
  |- index.html
  |- productos.json
  |- config.json
  |- assets
    |-style.css
    |-app.js
  |-pages
    |- Sobre-Nosotros
      |-index.html
    |-Contacto
      |- index.html
    |- Nuestros-Servicios
      |-index.html
    |- Productos
      |- index.html
    |-Terminos-y-condiciones
      |- index.html
    |-Politica-de-privacidad
      |- index.html
  |-media
    |-img
      |-img1.webp
      |-img2.webp
      |-logo-sinfondo.webp
      
## Copy
Utiliza tecnicas avanzadas de copy siempre enfocado a la conversión, en este caso agendar una cita via calendly o whatsapp

##Diseño

parte del index-borrador.html para elaborar el resto de pestañas secciones como footer y demás

## header

Incluye una nav bar con las secciones: Home, Sobre nosotros, Servicios, Productos, Contacto
logo: /media/img/logo-nav.web
favicon: /media/img/favicon.webp
## home
Hero section - background: /media/img/background-hero.webp - Similar a index-borrador.html
Seccion Testimonios - slider con 5 testimonios de clientes con estrellas y foto por el momento usa miniatura con letra como foto de perfil
Seccion Catálogo de productos: Slider que solo renderiza 5 productos de la categoría "mas vendidos" boton ver mas que lleva al path /productos
seccion como llegar: embed de google maps: 
<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.2661741585634!2d-79.3561663262944!3d-0.9532199353501619!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x91d4b5a5912e198f%3A0xfeac6b72a6202b!2sAgropecuaria%20Y%C3%81NEZ!5e0!3m2!1ses-419!2sec!4v1778086800733!5m2!1ses-419!2sec" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
footer:
  -contacto
  -politica de privacidad (ahref: pages/politica-privacidad)
  -terminos y condiciones (ahref: pages/terminos-y-condiciones
  -copyright Agropecuaria Yanez 2026 | Creado por Craft Marketing Agency (ahref: www.craftmarketing.agency)
## path/Sobre nosotros
Redacta un párrafo contando la historia de agropecuaria yanez 20 años de experiencia, fundacion crecimiento ayudando agricultores de la zona valencia los ríos incluye imagenes /media/img/sobre-nosotros.webp
## path/contacto
formulario contáctanos pide datos basicos y motivo de interes envía json a 
https://n8n.craftmarketing.agency/webhook/formulario-de-contacto
botón hablar por whatsapp con un walink a +593981648703 con el mensaje "Hola vi su web y me gustaría mas informacion sobre sus servicios"
una sección llámanos con los numeros de la informacion del cliente
Crea cada subpágina en la carpeta pages procurando que sea legible para cloduflare pages, haz que todas las páginas usen los mismos estilos
## path / Productos
Tal cual la funcion de catálogo de index-borrador.html con secciones con los modales por producto, carrito y terminacion de pedidio por whatsapp similar a index-borrador.html y todo renderizado desde productos.json
## path /Servicios

TRANSFORMEMOS LA AGRICULTURA CON CONOCIMIENTO
Te ofrecemos

SERVICIOS AGRÍCOLAS

Análisis de suelos y tejidos vegetales

Condición pH en agua y suelos

Diagnóstico de plagas y enfermedades

Monitoreo de fumigaciones con drones

Técnicas de cultivo sostenibles y manejo integrado de plagas

Recomendaciones técnicas de fertilización

Asesoría en adopción de herramientas tecnológicas

Manejo Fisio Nutricional## Tracking

Crea un script para ingresar aqui las etiquetas de GTM y que se aplique automaticamente en todos los sitios ya el resto se configura desde GTM

## Media
### Conversión de imágenes a WebP

Cuando trabajes con imágenes en este proyecto:

- Convierte todos los archivos `.jpg` y `.png` a formato `.webp`
- Usa calidad 80
- Mantén el mismo nombre base del archivo

## Comando recomendado (fish shell)

```bash
for f in *.jpg *.png
    cwebp -q 80 $f -o (basename $f | sed 's/\.[^.]*$/.webp/')
end

## Reglas
No sobrescribir archivos originales
Generar los .webp en el mismo directorio
Si el comando no aplica, generar uno equivalente según el entorno (bash/zsh)

## Responsive

Asegurate de que la web sea responsiva a moviles y tablets, sin bugs visuales y manteniendo el estilo y la legibilidad.

## Informacion del cliente
# Información del Cliente: AGROPECUARIA YÁNEZ

## 1. Información General
- **Nombre Legal / Razón Social:** YANEZ GARAY RICARDO LEONIDAS
- **RUC / Cédula:** 1713554945001
- **Teléfono / WhatsApp:** 981648703
- **Ciudad y País:** VALENCIA
- **Rubro o Industria:** Otro
- **Descripción del Negocio:** Comercializamos insumos orgánicos e inorgánicos para el sector agrícola y pecuario del Ecuador

## 2. Presencia Digital Actual
- **¿Tiene dominio propio?:** Sí
- **Dominio:** agropecuariayanez.com
- **Sitio Web Actual:** nan
- **¿Qué conservar/mejorar del sitio actual?:** La página web debo innovarla y hacerla más atractiva y metas claras

## 3. Objetivos y Estructura del Nuevo Sitio
- **Objetivo Principal:** Recibir consultas por WhatsApp, Mostrar mis productos o servicios, Vender online
- **Secciones Requeridas:** Inicio, Sobre nosotros, Servicios, Galería / Portafolio, Contacto

## 4. Identidad Visual y Diseño
- **Logo:** Sí, lo subo en el campo de abajo (Link: https://drive.google.com/open?id=1VhNRoN5gHgTIpiwSvjTEj15grWwOj_xj)
- **Colores de Marca:** ROJO, VERDE LIMON CLARO, BLANCO, NEGRO, VERDE MANZANA, VERDE CAÑA Y NARANJA
- **Estilo Visual:** Corporativo / Formal
- **Look & Feel (Descripción):** Vegetación abundante con iluminación de rayos solares
- **Lo que NO desea:** Mucho contenido de IA porque no se ve real la experiencia
