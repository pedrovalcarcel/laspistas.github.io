// ============================================
// BLOQUE 1 - CARGA DE DATOS DEL ACTA
// ============================================

// URL de partidos
const urlPartidosActa = obtenerUrlPartidosTemporadaActual();

// URL de eventos: goles, asistencias y tarjetas
const urlEventos = obtenerUrlEventosTemporadaActual();

// Jugadores
const urlJugadores = "jugadores.json";

const nombreMiEquipo = "Las Pistas FC"; // Asegúrate de que coincida exactamente con el texto en tu Excel


// Guardamos los partidos globalmente
let partidosGlobalActa = [];

// ============================================
// CARGAR TODOS LOS DATOS
// ============================================

async function cargarDatosActa() {

    try {

        // Obtener ID del partido desde la URL
        const params = new URLSearchParams(window.location.search);
        const partidoId = params.get("id");

        if (!partidoId) {

            console.error("No se ha encontrado el ID del partido en la URL.");

            mostrarErrorActa("No se ha indicado ningún partido.");

            return;
        }

        // Cargar datos en paralelo
        const [
            respuestaPartidos,
            respuestaEventos,
            respuestaJugadores
        ] = await Promise.all([

            fetch(urlPartidosActa),
            fetch(urlEventos),
            fetch(urlJugadores)

        ]);

        // Comprobar respuestas
        if (!respuestaPartidos.ok) {
            throw new Error("No se pudieron cargar los partidos.");
        }

        if (!respuestaEventos.ok) {
            throw new Error("No se pudieron cargar los eventos.");
        }

        if (!respuestaJugadores.ok) {
            throw new Error("No se pudieron cargar los jugadores.");
        }

        // Convertir datos
        const csvPartidos = await respuestaPartidos.text();
        const csvEventos = await respuestaEventos.text();
        const jugadores = await respuestaJugadores.json();

        partidosGlobalActa = csvToJSON(csvPartidos);

        const partidosEventos = csvToJSON(csvEventos);

        // ============================================
        // BUSCAR EL PARTIDO
        // ============================================

        const partido = partidosGlobalActa.find(
            p =>
                String(p.id).trim() ===
                String(partidoId).trim()
        );

        // Si no existe
        if (!partido) {

            console.error(
                "No se ha encontrado el partido con ID:",
                partidoId
            );

            mostrarErrorActa(
                `No se ha encontrado el partido con ID ${partidoId}.`
            );

            return;
        }

        // ============================================
        // DETECTAR TEMPORADA
        // ============================================
        // Cada hoja del Excel es ya de una única temporada, así
        // que de momento usamos toda la hoja tal cual.

        const partidosTemporada = partidosGlobalActa;

        // ============================================
        // EVENTOS DEL PARTIDO
        // ============================================

        const eventosDelPartido = partidosEventos.filter(
            e =>
                String(e.id_partido || "").trim() ===
                String(partidoId).trim()
        );

        // ============================================
        // CLASIFICACIÓN
        // ============================================

        let tabla = {};

        const jornadaActual = parseInt(partido.jornada);

        if (!isNaN(jornadaActual)) {

            tabla = calcularClasificacion(
                partidosTemporada,
                jornadaActual
            );

        }

        // ============================================
        // IA DE PREDICCIÓN
        // ============================================

        if (typeof inicializarIA === "function") {

            await inicializarIA(
                partidosTemporada,
                tabla
            );

        } else {

            console.error("❌ inicializarIA NO EXISTE");

        }


        // ============================================
        // RENDERIZAR ACTA
        // ============================================

        renderizarActa(
            partido,
            eventosDelPartido,
            jugadores,
            partidosTemporada
        );

        // ============================================
        // PREDICCIÓN
        // ============================================

        if (
            typeof mostrarPrediccion === "function"
        ) {

            mostrarPrediccion(partido);

        }

    } catch (error) {

        console.error(
            "Error al cargar el acta:",
            error
        );

        mostrarErrorActa(
            "Ha ocurrido un error al cargar el acta del partido."
        );

    }

}

// ============================================
// BLOQUE 2 - RENDERIZAR ACTA
// ============================================

function renderizarActa(
    partido,
    eventos,
    jugadores,
    partidosTemporada
) {

    const contenedor =
        document.getElementById("pagina-detalle-partido");

    if (!contenedor) {
        console.error(
            "No existe el contenedor #pagina-detalle-partido"
        );
        return;
    }


    // ============================================
    // NORMALIZAR DATOS
    // ============================================

    const listaJugadores =
        Array.isArray(jugadores)
            ? jugadores
            : (
                jugadores &&
                Array.isArray(jugadores.jugadores)
                    ? jugadores.jugadores
                    : []
            );


    const listaEventos =
        Array.isArray(eventos)
            ? eventos
            : [];


    const partidos =
        Array.isArray(partidosTemporada)
            ? partidosTemporada
            : [];


    // ============================================
    // BLOQUE 7
    // INFORMACIÓN DEL PARTIDO
    // ============================================

    const htmlInfoPartido =
        generarBloqueInformacionPartido(partido);


    // ============================================
    // BLOQUE 5
    // CLASIFICACIÓN PREVIA
    // ============================================

    const htmlTabla =
        generarBloqueClasificacionPrevia(
            partido,
            partidos
        );


    // ============================================
    // BLOQUE 6
    // RACHAS
    // ============================================

    const htmlRachas =
        generarBloqueRachas(
            partido,
            partidos
        );


    // ============================================
    // BLOQUE 3
    // EVENTOS
    // ============================================

    const htmlEventos =
        generarBloqueEventos(
            listaEventos,
            listaJugadores
        );


    // ============================================
    // BLOQUE 4
    // CONVOCADOS
    // ============================================

    const htmlConvocados =
        generarBloqueConvocados(
            partido,
            listaJugadores
        );


    // ============================================
    // CABECERA DEL PARTIDO
    // ============================================

    const tituloPartido = `

        <section class="cabecera-acta">

            <div class="jornada-acta">
                Jornada ${partido.jornada || "-"}
            </div>


            <div class="equipos-resultado-acta">


                <!-- LOCAL -->

                <div class="equipo-acta equipo-local-acta">

                    <a
                        href="equipo.html?nombre=${encodeURIComponent(partido.local)}"
                        class="link-equipo"
                    >
                        ${partido.local}
                    </a>

                </div>


                <!-- MARCADOR -->

                <div class="marcador-acta">

                    <span class="goles-acta">
                        ${
                            partido.goles_local !== undefined &&
                            partido.goles_local !== ""
                                ? partido.goles_local
                                : "-"
                        }
                    </span>


                    <span class="separador-marcador">
                        -
                    </span>


                    <span class="goles-acta">
                        ${
                            partido.goles_visitante !== undefined &&
                            partido.goles_visitante !== ""
                                ? partido.goles_visitante
                                : "-"
                        }
                    </span>

                </div>


                <!-- VISITANTE -->

                <div class="equipo-acta equipo-visitante-acta">

                    <a
                        href="equipo.html?nombre=${encodeURIComponent(partido.visitante)}"
                        class="link-equipo"
                    >
                        ${partido.visitante}
                    </a>

                </div>


            </div>

        </section>

    `;


    // ============================================
    // RENDERIZAR TODO
    // ============================================

    contenedor.innerHTML = `

        <div class="acta-partido">


            <!-- ==================================
                 CABECERA
            =================================== -->

            ${tituloPartido}


            <!-- ==================================
                 INFORMACIÓN DEL PARTIDO
            =================================== -->

            ${htmlInfoPartido}


            <!-- ==================================
                 CUERPO PRINCIPAL
            =================================== -->

            <div class="layout-acta-tres-columnas">


                <!-- =================================
                     COLUMNA IZQUIERDA
                ================================== -->

                <div class="columna columna-izquierda">

                    ${htmlTabla}

                    ${htmlRachas}

                </div>


                <!-- =================================
                     COLUMNA CENTRAL
                ================================== -->

                <div class="columna columna-centro">

                    ${htmlConvocados}

                    ${htmlEventos}

                </div>


                <!-- =================================
                     COLUMNA DERECHA
                ================================== -->

                <div class="columna columna-derecha">

                    <section class="acta-seccion prediccion-acta">


                        <div class="titulo-seccion-acta">

                            <h2>
                                🤖 Predicción IA
                            </h2>

                        </div>


                        <div id="contenedor-prediccion">

                            <p class="sin-datos">
                                Cargando predicción...
                            </p>

                        </div>


                    </section>

                </div>


            </div>

        </div>

    `;


    // ============================================
    // TOOLTIPS DE LA RACHA
    // ============================================

    try {

        if (typeof activarTooltipsRacha === "function") {
            activarTooltipsRacha(contenedor, partidos);
        }

    } catch (error) {

        console.warn("No se pudieron activar los tooltips de la racha:", error);

    }

    // ============================================
    // PREDICCIÓN IA
    // ============================================

    try {

        if (
            typeof mostrarPrediccion === "function"
        ) {

            mostrarPrediccion(partido);

        }

    } catch (error) {

        console.warn(
            "No se pudo mostrar la predicción:",
            error
        );

    }

}


// ============================================
// MOSTRAR ERROR EN EL ACTA
// ============================================

function mostrarErrorActa(mensaje) {

    const contenedor =
        document.getElementById(
            "pagina-detalle-partido"
        );

    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="error-acta">
            <h2>⚠️ Error</h2>
            <p>${mensaje}</p>
            <a href="resultados.html">
                Volver a resultados
            </a>
        </div>
    `;

}


// ============================================
// INICIAR CUANDO CARGUE LA PÁGINA
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    cargarDatosActa
);

// ============================================
// BLOQUE 3 - EVENTOS DEL PARTIDO
// ============================================

// ============================================
// BLOQUE 3 - EVENTOS DEL PARTIDO
// ============================================

function generarBloqueEventos(eventos, jugadores) {

    // --------------------------------------------
    // NORMALIZAR JUGADORES
    // --------------------------------------------

    const listaJugadores =
        Array.isArray(jugadores)
            ? jugadores
            : (jugadores?.jugadores || []);


    // --------------------------------------------
    // BUSCAR JUGADOR
    // --------------------------------------------

    function obtenerJugador(dorsal) {

        if (
            dorsal === undefined ||
            dorsal === null ||
            String(dorsal).trim() === ""
        ) {
            return null;
        }

        return listaJugadores.find(
            jugador =>
                String(jugador.dorsal).trim() ===
                String(dorsal).trim()
        ) || null;
    }


    // --------------------------------------------
    // OBTENER ALIAS
    // --------------------------------------------

    function obtenerNombre(dorsal) {

        const jugador = obtenerJugador(dorsal);

        if (jugador) {
            return jugador.alias;
        }

        return `Dorsal ${dorsal}`;
    }

    function obtenerLinkJugador(dorsal) {

        const jugador = obtenerJugador(dorsal);

        if (jugador) {
            return `
                <a
                    href="jugador.html?dorsal=${encodeURIComponent(
                        jugador.dorsal
                    )}"
                    class="link-equipo"
                >
                    ${jugador.alias}
                </a>
            `;
        }

        return `Dorsal ${dorsal}`;
    }


    // --------------------------------------------
    // FILTRAR EVENTOS
    // --------------------------------------------

    const listaEventos =
        Array.isArray(eventos)
            ? eventos
            : [];


    const goles = listaEventos.filter(
        evento =>
            evento.dorsal_goleador &&
            String(evento.dorsal_goleador).trim() !== ""
    );


    const amarillas = listaEventos.filter(
        evento =>
            evento.dorsal_tarjeta_amarilla &&
            String(evento.dorsal_tarjeta_amarilla).trim() !== ""
    );


    const rojas = listaEventos.filter(
        evento =>
            evento.dorsal_tarjeta_roja &&
            String(evento.dorsal_tarjeta_roja).trim() !== ""
    );


    // ============================================
    // GOLES
    // ============================================

    const htmlGoles = goles.length > 0

        ? goles.map(gol => {

            const goleador =
                obtenerLinkJugador(gol.dorsal_goleador);


            // ------------------------------------
            // ASISTENTE
            // ------------------------------------

            let asistenciaHTML = "";

            if (
                gol.dorsal_asistente &&
                String(gol.dorsal_asistente).trim() !== ""
            ) {

                const asistente =
                    obtenerLinkJugador(gol.dorsal_asistente);


                asistenciaHTML = `

                    <div class="evento-asistencia">

                        <span class="icono-asistencia">
                            🅰️
                        </span>

                        <span>
                            ${asistente}
                        </span>

                    </div>

                `;

            }


            // ------------------------------------
            // HTML DEL GOL
            // ------------------------------------

            return `

                <div class="evento-gol">

                    <div class="evento-principal">

                        <span class="icono-evento">
                            ⚽
                        </span>

                        <strong>
                            ${goleador}
                        </strong>

                    </div>


                    ${asistenciaHTML}

                </div>

            `;

        }).join("")


        : `

            <p class="sin-datos">
                No hay goles registrados.
            </p>

        `;


    // ============================================
    // TARJETAS AMARILLAS
    // ============================================

    const htmlAmarillas = amarillas.length > 0

        ? amarillas.map(tarjeta => {

            const jugador =
                obtenerNombre(
                    tarjeta.dorsal_tarjeta_amarilla
                );


            return `

                <div class="evento-tarjeta tarjeta-amarilla">

                    <span class="icono-evento">
                        🟨
                    </span>

                    <strong>
                        ${jugador}
                    </strong>

                </div>

            `;

        }).join("")


        : `

            <p class="sin-datos">
                No hay tarjetas amarillas.
            </p>

        `;


    // ============================================
    // TARJETAS ROJAS
    // ============================================

    const htmlRojas = rojas.length > 0

        ? rojas.map(tarjeta => {

            const jugador =
                obtenerNombre(
                    tarjeta.dorsal_tarjeta_roja
                );


            return `

                <div class="evento-tarjeta tarjeta-roja">

                    <span class="icono-evento">
                        🟥
                    </span>

                    <strong>
                        ${jugador}
                    </strong>

                </div>

            `;

        }).join("")


        : `

            <p class="sin-datos">
                No hay tarjetas rojas.
            </p>

        `;


    // ============================================
    // HTML FINAL
    // ============================================

    return `

        <div class="bloque-eventos">


            <!-- ==========================
                 GOLES
            =========================== -->

            <section class="evento-seccion">

                <h2>
                    Goles
                </h2>

                <div class="lista-eventos">

                    ${htmlGoles}

                </div>

            </section>


            <!-- ==========================
                 TARJETAS
            =========================== -->

            <section class="evento-seccion">

                <h2>
                    🟨🟥 Tarjetas
                </h2>

                <div class="lista-eventos">

                    ${htmlAmarillas}

                    ${htmlRojas}

                </div>

            </section>


        </div>

    `;
}

// ============================================
// BLOQUE 4 - CONVOCADOS
// ============================================

function generarBloqueConvocados(partido, jugadores) {

    const listaJugadores =
        Array.isArray(jugadores)
            ? jugadores
            : (jugadores?.jugadores || []);

    // --------------------------------------------
    // OBTENER DORSALES CONVOCADOS
    // --------------------------------------------

    const dorsalesConvocados = partido.convocados
        ? String(partido.convocados)
            .split("-")
            .map(dorsal => dorsal.trim())
            .filter(dorsal => dorsal !== "")
        : [];


    // --------------------------------------------
    // BUSCAR JUGADORES
    // --------------------------------------------

    const convocados = dorsalesConvocados
        .map(dorsal => {

            return listaJugadores.find(
                jugador =>
                    String(jugador.dorsal).trim() === dorsal
            );

        })
        .filter(jugador => jugador !== undefined)
        .sort(
            (a, b) =>
                Number(a.dorsal) - Number(b.dorsal)
        );


    // --------------------------------------------
    // SI NO HAY CONVOCADOS
    // --------------------------------------------

    if (convocados.length === 0) {

        return `
            <section class="acta-seccion convocados-acta">

                <h2>👥 Convocados</h2>

                <p class="sin-datos">
                    No hay convocados registrados.
                </p>

            </section>
        `;

    }


    // --------------------------------------------
    // GENERAR JUGADORES
    // --------------------------------------------

    const htmlJugadores = convocados
        .map(jugador => {

            return `

                <a
                    href="jugador.html?dorsal=${encodeURIComponent(jugador.dorsal)}"
                    class="jugador-convocado"
                >

                    <span class="dorsal-convocado">
                        ${jugador.dorsal}
                    </span>

                    <span class="alias-convocado">
                        ${jugador.alias}
                    </span>

                </a>

            `;

        })
        .join("");


    // --------------------------------------------
    // DEVOLVER BLOQUE
    // --------------------------------------------

    return `

        <section class="acta-seccion convocados-acta">

            <div class="titulo-seccion-acta">

                <h2>👥 Convocados</h2>

                <span class="contador-convocados">
                    ${convocados.length}
                </span>

            </div>


            <div class="lista-convocados">

                ${htmlJugadores}

            </div>

        </section>

    `;
}

// ============================================
// BLOQUE 5 - CLASIFICACIÓN PREVIA AL PARTIDO
// ============================================

function generarBloqueClasificacionPrevia(
    partido,
    partidos
) {

    if (
        !partido ||
        !Array.isArray(partidos)
    ) {
        return `
            <section class="acta-seccion">

                <h2>📊 Clasificación</h2>

                <p class="sin-datos">
                    No hay datos de clasificación.
                </p>

            </section>
        `;
    }


    // ============================================
    // PARTIDOS ANTERIORES AL PARTIDO ACTUAL
    // ============================================

    const fechaPartido =
        convertirFecha(partido.fecha);


    const partidosPrevios = partidos.filter(p => {

        if (
            !p.jornada ||
            !/^\d+$/.test(String(p.jornada))
        ) {
            return false;
        }

        if (
            p.goles_local === "" ||
            p.goles_visitante === ""
        ) {
            return false;
        }

        return Number(p.jornada) < Number(partido.jornada);

    });


    // ============================================
    // CALCULAR CLASIFICACIÓN
    // ============================================

    let tabla = {};

    if (
        typeof calcularClasificacion === "function"
    ) {

        tabla =
            calcularClasificacion(
                partidosPrevios,
                Infinity
            ) || {};

    }

        // ============================================
    // CLASIFICACIÓN DE LA JORNADA ANTERIOR
    // ============================================

    let tablaAnterior = {};

    if (
        typeof calcularClasificacion === "function"
    ) {

        tablaAnterior =
            calcularClasificacion(
                partidos.filter(p => {

                    if (
                        !p.jornada ||
                        !/^\d+$/.test(String(p.jornada))
                    ) {
                        return false;
                    }

                    if (
                        p.goles_local === "" ||
                        p.goles_visitante === ""
                    ) {
                        return false;
                    }

                    return (
                        Number(p.jornada) <
                        Number(partido.jornada) - 1
                    );

                }),
                Infinity
            ) || {};

    }

    function ordenarTabla(tabla) {

        return Object.entries(tabla)
            .map(([equipo, datos]) => ({
                equipo,
                ...datos,
                dg: datos.gf - datos.gc
            }))
            .sort((a, b) => {

                if (b.pts !== a.pts)
                    return b.pts - a.pts;

                if (b.dg !== a.dg)
                    return b.dg - a.dg;

                return b.gf - a.gf;

            });

    }

    const clasificacionAnterior =
        ordenarTabla(tablaAnterior);

    const posicionesAnteriores = {};

    clasificacionAnterior.forEach((equipo, indice) => {

        posicionesAnteriores[equipo.equipo] =
            indice + 1;

    });


    // ============================================
    // CONVERTIR A ARRAY
    // ============================================

    const equipos =
        Object.keys(tabla)
            .map(nombre => {

                const datos =
                    tabla[nombre] || {};

                return {

                    equipo: nombre,

                    pj:
                        Number(datos.pj) || 0,

                    gf:
                        Number(datos.gf) || 0,

                    gc:
                        Number(datos.gc) || 0,

                    pts:
                        Number(datos.pts) || 0

                };

            })
            .map(equipo => ({

                ...equipo,

                dg:
                    equipo.gf -
                    equipo.gc

            }))
            .sort((a, b) => {

                if (b.pts !== a.pts) {
                    return b.pts - a.pts;
                }

                if (b.dg !== a.dg) {
                    return b.dg - a.dg;
                }

                return b.gf - a.gf;

            });


    // ============================================
    // SI NO HAY DATOS
    // ============================================

    if (equipos.length === 0) {

        return `

            <section class="acta-seccion">

                <h2>📊 Clasificación</h2>

                <p class="sin-datos">
                    No hay clasificación disponible.
                </p>

            </section>

        `;

    }


    // ============================================
    // GENERAR FILAS
    // ============================================

    const nombresEquiposPartido = [
        String(partido.local || "").trim().toLowerCase(),
        String(partido.visitante || "").trim().toLowerCase()
    ];

    const filas =
        equipos.map((equipo, index) => {

            const nombreEquipo =
                equipo.equipo
                    .trim()
                    .toLowerCase();

            const esMiEquipo =
                nombreEquipo ===
                nombreMiEquipo
                    .trim()
                    .toLowerCase();

            const esEquipoPartido =
                nombresEquiposPartido.includes(
                    nombreEquipo
                );

            const claseFila =
                esEquipoPartido
                    ? `highlight ${
                        esMiEquipo
                            ? "highlight-mi"
                            : "highlight-rival"
                    }`
                    : "";

                    const posicionActual = index + 1;

        const posicionAnterior =
            posicionesAnteriores[equipo.equipo];

        let flecha = "";

            if (posicionAnterior) {

                if (posicionActual < posicionAnterior) {

                    flecha =
                        '<span class="flecha-clasi subida">▲</span>';

                }
                else if (posicionActual > posicionAnterior) {

                    flecha =
                        '<span class="flecha-clasi bajada">▼</span>';

                }
                else {

                    flecha =
                        '<span class="flecha-clasi igual">►</span>';

                }

        }

            return `

                <tr
                    class="${claseFila}"
                >

                    <td class="posicion-clasi">
                        ${posicionActual}
                        ${flecha}
                    </td>


                    <td class="equipo-clasi">

                        <a
                            href="equipo.html?nombre=${encodeURIComponent(equipo.equipo)}"
                            class="link-equipo"
                        >
                            ${equipo.equipo}
                        </a>

                    </td>


                    <td>
                        ${equipo.pj}
                    </td>


                    <td>
                        ${
                            equipo.dg > 0
                                ? "+"
                                : ""
                        }${equipo.dg}
                    </td>


                    <td>
                        <strong>
                            ${equipo.pts}
                        </strong>
                    </td>

                </tr>

            `;

        }).join("");


    // ============================================
    // HTML FINAL
    // ============================================

    return `

        <section class="acta-seccion clasificacion-acta">

            <div class="titulo-seccion-acta">

                <h2>
                    📊 Clasificación
                </h2>

                <span class="subtitulo-acta">
                    Antes de la jornada ${partido.jornada}
                </span>

            </div>


            <div class="tabla-acta-wrapper">

                <table class="tabla-mini-clasi">

                    <thead>

                        <tr>

                            <th>
                                Pos
                            </th>

                            <th>
                                Equipo
                            </th>

                            <th>
                                PJ
                            </th>

                            <th>
                                DG
                            </th>

                            <th>
                                Pts
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${filas}

                    </tbody>

                </table>

            </div>

        </section>

    `;
}

// ============================================
// CONVERTIR FECHA DD/MM/YYYY
// ============================================

function convertirFecha(fecha) {

    if (!fecha) {
        return null;
    }

    const partes =
        String(fecha)
            .trim()
            .split("/");


    if (partes.length !== 3) {
        return null;
    }


    const dia =
        Number(partes[0]);

    const mes =
        Number(partes[1]) - 1;

    const año =
        Number(partes[2]);


    const fechaConvertida =
        new Date(
            año,
            mes,
            dia
        );


    if (
        Number.isNaN(
            fechaConvertida.getTime()
        )
    ) {
        return null;
    }


    return fechaConvertida;
}

// ============================================
// BLOQUE 6 - RACHAS DE LOS EQUIPOS
// ============================================

function generarBloqueRachas(partido, partidos) {

    let rachaLocal = "";
    let rachaVisitante = "";

    // --------------------------------------------
    // LOCAL
    // --------------------------------------------

    if (
        typeof generarHTMLRacha === "function" &&
        Array.isArray(partidos)
    ) {

        try {

            rachaLocal = generarHTMLRacha(
                partido.local,
                partidos,
                partido.fecha
            );

        } catch (error) {

            console.warn(
                "No se pudo generar la racha local:",
                error
            );

            rachaLocal = "";

        }

    }


    // --------------------------------------------
    // VISITANTE
    // --------------------------------------------

    if (
        typeof generarHTMLRacha === "function" &&
        Array.isArray(partidos)
    ) {

        try {

            rachaVisitante = generarHTMLRacha(
                partido.visitante,
                partidos,
                partido.fecha
            );

        } catch (error) {

            console.warn(
                "No se pudo generar la racha visitante:",
                error
            );

            rachaVisitante = "";

        }

    }


    // --------------------------------------------
    // HTML DE UNA RACHA
    // --------------------------------------------

    function generarEquipoRacha(
        nombreEquipo,
        htmlRacha
    ) {

        return `

            <div class="racha-equipo">

                <div class="racha-equipo-titulo">

                    <h3>
                        ${nombreEquipo}
                    </h3>

                </div>


                <div class="racha-container">

                    ${
                        htmlRacha &&
                        htmlRacha.trim() !== ""

                            ? htmlRacha

                            : `
                                <span class="sin-datos">
                                    No hay partidos anteriores.
                                </span>
                              `
                    }

                </div>

            </div>

        `;

    }


    // --------------------------------------------
    // DEVOLVER BLOQUE COMPLETO
    // --------------------------------------------

    return `

        <section class="acta-seccion rachas-acta">

            <div class="titulo-seccion-acta">

                <h2>
                    📈 Racha reciente
                </h2>

            </div>


            <div class="rachas-comparacion">

                ${generarEquipoRacha(
                    partido.local,
                    rachaLocal
                )}


                ${generarEquipoRacha(
                    partido.visitante,
                    rachaVisitante
                )}

            </div>

        </section>

    `;
}

function obtenerDiaSemana(fecha) {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const [d, m, a] = fecha.split("/");
    return dias[new Date(a, m - 1, d).getDay()];
}

// ============================================
// BLOQUE 7 - INFORMACIÓN DEL PARTIDO
// ============================================

function generarBloqueInformacionPartido(partido) {

    if (!partido) {
        return "";
    }

    const fecha =
        partido.fecha
            ? partido.fecha.trim()
            : "";

    const hora =
        partido.hora
            ? partido.hora.trim()
            : "";

    const campo =
        partido.campo
            ? partido.campo.trim()
            : "";

    const arbitro =
        partido.arbitro
            ? partido.arbitro.trim()
            : "";


    // --------------------------------------------
    // DÍA DE LA SEMANA
    // --------------------------------------------

    let diaSemana = "";

    if (
        fecha &&
        typeof obtenerDiaSemana === "function"
    ) {

        try {

            diaSemana =
                obtenerDiaSemana(fecha);

        } catch (error) {

            console.warn(
                "No se pudo obtener el día de la semana:",
                error
            );

        }

    }


    // --------------------------------------------
    // CREAR ELEMENTO DE INFORMACIÓN
    // --------------------------------------------

    function crearDato(icono, titulo, valor) {

        if (!valor) {
            return "";
        }

        return `

            <div class="dato-partido">

                <div class="dato-partido-icono">
                    ${icono}
                </div>

                <div class="dato-partido-texto">

                    <span class="dato-partido-titulo">
                        ${titulo}
                    </span>

                    <span class="dato-partido-valor">
                        ${valor}
                    </span>

                </div>

            </div>

        `;
    }


    // --------------------------------------------
    // HTML
    // --------------------------------------------

    return `

        <section class="info-partido-acta">

            <div class="titulo-seccion-acta">

                <h2>
                    📋 Información del partido
                </h2>

            </div>


            <div class="datos-partido-grid">

                ${
                    crearDato(
                        "📅",
                        "Fecha",
                        diaSemana
                            ? `${diaSemana}, ${fecha}`
                            : fecha
                    )
                }


                ${
                    crearDato(
                        "⏰",
                        "Hora",
                        hora
                    )
                }


                ${
                    crearDato(
                        "📍",
                        "Campo",
                        campo
                    )
                }


                ${
                    crearDato(
                        "👨‍⚖️",
                        "Árbitro",
                        arbitro
                    )
                }

            </div>

        </section>

    `;
}