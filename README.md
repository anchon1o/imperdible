# Imperdible

Reto diario: cada día se pierde un imperdible en algún lugar del mundo y hay 10 intentos para encontrarlo por frío/caliente.
Idiomas: galego, castellano, català y euskara. Ranking opcional sin registro. 833 lugares incluidos.

## Qué hay en el proyecto

```
public/index.html   el juego
public/admin.html   panel de administración (lugares y moderación del ranking)
public/pin.png, sticker.png, stuck.png (o imperdible cravado no mapa)
api/place.js        entrega el lugar de cada día (nunca los futuros)
api/scores.js       ranking del día y de la semana
api/admin.js        guardar la lista de lugares, moderar nombres
api/train.js        lugar al azar para el modo adestramento
api/_lib.js         conexión a la base de datos y utilidades
schema.sql          tablas imp_* (opcional, se crean solas)
data/places.json    lista inicial de lugares
```

Las tablas de la base de datos se crean solas la primera vez. No hay que ejecutar SQL.

## Instalación (GitHub + Supabase + Vercel)

Las tablas llevan el prefijo `imp_` (`imp_config`, `imp_players`, `imp_scores`), así que pueden convivir con las de otros proyectos en la misma base de datos de Supabase.

1. **GitHub.** Crea un repositorio (por ejemplo `imperdible`) y sube el contenido de esta carpeta.
2. **Supabase.** En tu proyecto, pulsa **Connect** (arriba) → pestaña *Connection string* → **Transaction pooler** y copia la URI:
   `postgresql://postgres.XXXX:[YOUR-PASSWORD]@aws-0-eu-....pooler.supabase.com:6543/postgres`
   Sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos.
   Opcional: ejecuta `schema.sql` en el *SQL Editor*. Si no lo haces, la API crea las tablas sola la primera vez.
3. **Vercel.** *Add New… → Project* → importa el repositorio → *Framework Preset*: **Other**.
   Antes de desplegar, en *Environment Variables* añade:
   - `DATABASE_URL` = la URI de Supabase del paso 2
   - `ADMIN_KEY` = una contraseña larga que solo sepas tú
   Pulsa *Deploy*.
4. Abre `https://tu-proyecto.vercel.app/admin.html`, entra con la `ADMIN_KEY` y comprueba que aparece la lista de lugares. Juega una partida y publica una puntuación para comprobar el ranking.

Seguridad: las tablas tienen RLS activado y sin políticas, así que la API pública de Supabase (la clave `anon`) no puede leerlas ni modificarlas. Solo el juego accede a ellas, a través de las funciones de Vercel.

Sin base de datos el juego también funciona, pero sin ranking y sin poder guardar cambios en los lugares.

## Administración

Entra en `https://tu-dominio/admin.html` y escribe la `ADMIN_KEY`.

- Ves la lista completa con el número de reto y la fecha en que toca cada lugar. El de hoy aparece resaltado.
- **Editar**: nombre y país en los cuatro idiomas y coordenadas. Puedes tocar el mini-mapa para situarlo.
- **Añadir al final**: los lugares nuevos entran al final de la lista, así no cambian los retos ya programados.
- **Importar**: pega JSON o líneas CSV `nombre;país;lat;lon` (y opcionalmente `;nombre_gl;país_gl;nombre_ca;país_ca;nombre_eu;país_eu`).
- **Exportar JSON**: copia de seguridad de la lista.
- **Probar este reto**: abre el juego con ese reto en modo prueba (no cuenta en estadísticas ni ranking).
- **Moderación**: quita del ranking a quien use un nombre inadecuado.

Nada se aplica hasta pulsar **Guardar cambios**. Mientras no guardes nada, el juego usa `data/places.json`.

Cuando entras en el panel desde un navegador, ese navegador queda como administrador: en la ayuda del juego verás el modo pruebas y el enlace a la administración.

### Cómo se elige el lugar de cada día

El reto nº 1 es el 29/09/2026. El reto nº N usa el lugar número N de la lista y, al llegar al final, vuelve a empezar.
Por eso conviene **añadir siempre al final** y no reordenar lugares anteriores al de hoy.

## Modo adestramento

Desde la ayuda (?) se cambia entre **Reto diario** y **Adestramento**. En adestramento los lugares salen al azar (se puede filtrar por zona), no hay límite de partidas y no cuenta para el ranking ni para las estadísticas. Nunca salen los lugares de los próximos 60 retos diarios.

## Reglas de puntuación

- Se gana a menos de 150 km.
- Encontrado: 600 puntos + 40 por intento sobrante + hasta 40 por rapidez (máximo 1000).
- No encontrado: 5 puntos por cada grado máximo alcanzado (máximo 495).
- Ranking: hoy; semana (suma de los 5 mejores días de los últimos 7); mes (suma de los días del mes en curso); siempre (suma total).
- Cada persona publica una sola puntuación por día. La primera que envía es la que cuenta.

## Probar en local

```
npm install -g vercel
npm install
vercel dev
```

Con un archivo `.env` que tenga `DATABASE_URL` y `ADMIN_KEY`.

## Cambiar parámetros

Al principio del script de `public/index.html` (bloque `CONFIG`) están los intentos, el radio de victoria y la fecha del reto nº 1.
Si cambias `MAX_TRIES` o la fecha, cámbialos también en `api/_lib.js`.
