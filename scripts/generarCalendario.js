// =======================================================
// GENERADOR DE CALENDARIO
// LAS PISTAS FC
// =======================================================

const fs = require("fs");

const Papa = require("papaparse");

const { createEvents } = require("ics");

const fetch = (...args) =>
    import("node-fetch")
        .then(({ default: fetch }) => fetch(...args));


// =======================================================
// CONFIGURACIÓN GLOBAL
// =======================================================

const {

    SPREADSHEET_ID,

    TEMPORADA_CSV_GIDS

} = require("../configTemporadas");


const MI_EQUIPO = "Las Pistas FC";

const URL_WEB = "https://pedrovalcarcel.github.io";

const DURACION_PARTIDO = 90; // minutos


// =======================================================
// OBTENER TEMPORADA ACTUAL
// =======================================================

function obtenerTemporadaActual() {

    const hoy = new Date();

    const año = hoy.getFullYear();

    const mes = hoy.getMonth() + 1;

    if (mes >= 9) {

        return `${año}/${String(año + 1).slice(-2)}`;

    }

    return `${año - 1}/${String(año).slice(-2)}`;

}


// =======================================================
// OBTENER URL DEL CSV
// =======================================================

function obtenerURLCSV() {

    const temporada =
        obtenerTemporadaActual();

    const config =
        TEMPORADA_CSV_GIDS[temporada];

    if (!config) {

        throw new Error(

            `No existe configuración para la temporada ${temporada}.`

        );

    }

    return `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?gid=${config.partidos}&single=true&output=csv`;

}

// =======================================================
// DESCARGAR CSV
// =======================================================

async function descargarCSV() {

    console.log("");

    console.log("====================================");

    console.log("📥 Descargando CSV...");

    console.log("====================================");

    const respuesta = await fetch(

        obtenerURLCSV()

    );

    if (!respuesta.ok) {

        throw new Error(

            `Error descargando el CSV (${respuesta.status})`

        );

    }

    const texto = await respuesta.text();

    console.log("✅ CSV descargado correctamente.");

    return texto;

}


// =======================================================
// CONVERTIR CSV A JSON
// =======================================================

function convertirCSVaJSON(csv) {

    const resultado = Papa.parse(

        csv,

        {

            header: true,

            skipEmptyLines: true

        }

    );

    if (resultado.errors.length > 0) {

        console.warn("");

        console.warn("⚠ Advertencias leyendo el CSV:");

        console.warn(resultado.errors);

    }

    console.log(

        `📄 ${resultado.data.length} partidos leídos.`

    );

    return resultado.data;

}

// =======================================================
// VALIDAR PARTIDO
// =======================================================

function validarPartido(partido) {

    //--------------------------------------------------
    // ID
    //--------------------------------------------------

    if (!partido.id) {

        console.warn("⚠ Partido sin ID.");

        return false;

    }

    //--------------------------------------------------
    // FECHA
    //--------------------------------------------------

    if (!partido.fecha) {

        console.warn(

            `⚠ Partido ${partido.id} sin fecha.`

        );

        return false;

    }

    //--------------------------------------------------
    // HORA
    //--------------------------------------------------

    if (!partido.hora) {

        console.warn(

            `⚠ Partido ${partido.id} sin hora.`

        );

        return false;

    }

    //--------------------------------------------------
    // LOCAL
    //--------------------------------------------------

    if (!partido.local) {

        console.warn(

            `⚠ Partido ${partido.id} sin equipo local.`

        );

        return false;

    }

    //--------------------------------------------------
    // VISITANTE
    //--------------------------------------------------

    if (!partido.visitante) {

        console.warn(

            `⚠ Partido ${partido.id} sin equipo visitante.`

        );

        return false;

    }

    //--------------------------------------------------
    // FORMATO FECHA
    //--------------------------------------------------

    const partesFecha = partido.fecha.split("/");

    if (partesFecha.length !== 3) {

        console.warn(

            `⚠ Fecha incorrecta en partido ${partido.id}: ${partido.fecha}`

        );

        return false;

    }

    //--------------------------------------------------
    // FORMATO HORA
    //--------------------------------------------------

    const partesHora = partido.hora.split(":");

    if (partesHora.length !== 2) {

        console.warn(

            `⚠ Hora incorrecta en partido ${partido.id}: ${partido.hora}`

        );

        return false;

    }

    //--------------------------------------------------
    // TODO CORRECTO
    //--------------------------------------------------

    return true;

}

// =======================================================
// FILTRAR PARTIDOS PARA EL CALENDARIO
// =======================================================

function obtenerPartidosCalendario(partidos) {

    const partidosCalendario = partidos.filter(partido => {

        //--------------------------------------------------
        // Validación
        //--------------------------------------------------

        if (!validarPartido(partido)) {

            return false;

        }

        //--------------------------------------------------
        // Solo partidos de Las Pistas FC
        //--------------------------------------------------

        if (

            partido.local !== MI_EQUIPO &&
            partido.visitante !== MI_EQUIPO

        ) {

            return false;

        }

        //--------------------------------------------------
        // Ignorar amistosos
        //--------------------------------------------------

        if (

            String(partido.jornada)
                .trim()
                .toLowerCase() === "amistoso"

        ) {

            return false;

        }

        return true;

    });

    console.log("");

    console.log(

        `⚽ ${partidosCalendario.length} partidos de ${MI_EQUIPO}.`

    );

    return partidosCalendario;

}

// =======================================================
// CREAR EVENTOS ICS
// =======================================================

function crearEventos(partidos) {

    const eventos = [];

    for (const partido of partidos) {

        //------------------------------------------
        // FECHA
        //------------------------------------------

        const [dia, mes, año] =
            partido.fecha.split("/").map(Number);

        //------------------------------------------
        // HORA
        //------------------------------------------

        const [hora, minuto] =
            partido.hora.split(":").map(Number);

        //------------------------------------------
        // TÍTULO
        //------------------------------------------

        const titulo =
            `⚽ Jornada ${partido.jornada} · ${partido.local} - ${partido.visitante}`;

        //------------------------------------------
        // DESCRIPCIÓN
        //------------------------------------------

        let descripcion = "";

        descripcion += `Jornada ${partido.jornada}\n\n`;

        descripcion += `🏠 Local: ${partido.local}\n`;

        descripcion += `🚌 Visitante: ${partido.visitante}\n\n`;

        descripcion += `📍 Campo: ${partido.campo || "Por confirmar"}\n`;

        descripcion += `🕒 Hora: ${partido.hora}\n`;

        descripcion += `👨‍⚖️ Árbitro: ${partido.arbitro || "Por confirmar"}\n\n`;

        descripcion += `📄 Acta del partido:\n`;

        descripcion += `${URL_WEB}/detalle_partido.html?id=${partido.id}\n\n`;

        descripcion += `🌐 Web oficial:\n`;

        descripcion += `${URL_WEB}`;

        //------------------------------------------
        // EVENTO
        //------------------------------------------

        eventos.push({

            uid:
                `partido-${partido.id}@pedrovalcarcel.github.io`,

            title:
                titulo,

            description:
                descripcion,

            location:
                partido.campo || "",

            start: [

                año,

                mes,

                dia,

                hora,

                minuto

            ],

            duration: {

                hours: Math.floor(DURACION_PARTIDO / 60),

                minutes: DURACION_PARTIDO % 60

            },

            startOutputType: "local",

            status: "CONFIRMED",

            busyStatus: "BUSY",

            organizer: {

                name: "Las Pistas FC",

                email: "no-reply@pedrovalcarcel.github.io"

            }

        });

    }

    console.log("");

    console.log(`📅 ${eventos.length} eventos creados.`);

    return eventos;

}

// =======================================================
// GENERAR ARCHIVO ICS
// =======================================================

async function generarArchivoICS(eventos) {

    return new Promise((resolve, reject) => {

        createEvents(

            eventos,

            (error, valor) => {

                if (error) {

                    reject(error);

                    return;

                }

                fs.writeFileSync(

                    "calendario.ics",

                    valor,

                    "utf8"

                );

                console.log("");

                console.log("====================================");

                console.log("✅ Calendario generado correctamente");

                console.log("====================================");

                console.log(`📅 Eventos: ${eventos.length}`);

                console.log("📄 Archivo: calendario.ics");

                console.log("");

                resolve();

            }

        );

    });

}

// =======================================================
// PROGRAMA PRINCIPAL
// =======================================================

(async () => {

    try {

        console.log("");

        console.log("====================================");

        console.log("⚽ LAS PISTAS FC");

        console.log("Generador de calendario");

        console.log("====================================");

        //--------------------------------------------------
        // Descargar CSV
        //--------------------------------------------------

        const csv = await descargarCSV();

        //--------------------------------------------------
        // Convertir a JSON
        //--------------------------------------------------

        const partidos = convertirCSVaJSON(csv);

        //--------------------------------------------------
        // Filtrar partidos
        //--------------------------------------------------

        const partidosCalendario = obtenerPartidosCalendario(partidos);

        //--------------------------------------------------
        // Crear eventos
        //--------------------------------------------------

        const eventos = crearEventos(partidosCalendario);

        //--------------------------------------------------
        // Generar ICS
        //--------------------------------------------------

        await generarArchivoICS(eventos);

        console.log("");

        console.log("====================================");

        console.log("🎉 PROCESO FINALIZADO");

        console.log("====================================");

        console.log(`Temporada: ${obtenerTemporadaActual()}`);

        console.log(`Partidos leídos: ${partidos.length}`);

        console.log(`Eventos generados: ${eventos.length}`);

        console.log("");

    }

    catch (error) {

        console.error("");

        console.error("❌ ERROR");

        console.error(error);

        process.exit(1);

    }

})();