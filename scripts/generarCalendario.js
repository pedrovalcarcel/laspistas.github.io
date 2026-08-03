// =======================================================
// GENERADOR DE CALENDARIO - LAS PISTAS FC
// =======================================================

const fs = require("fs");

const Papa = require("papaparse");

const fetch = (...args) =>
    import("node-fetch")
        .then(({ default: fetch }) => fetch(...args));


// =======================================================
// CONFIGURACIÓN
// =======================================================

const MI_EQUIPO = "Las Pistas FC";

const DURACION_PARTIDO = 60; // minutos

const URL_WEB = "https://pedrovalcarcel.github.io/laspistas.github.io";


// =======================================================
// CONFIGURACIÓN DE TEMPORADAS
// =======================================================

const {

    SPREADSHEET_ID,

    TEMPORADA_CSV_GIDS

} = require("../configTemporadas");


// =======================================================
// TEMPORADA ACTUAL
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
// URL CSV
// =======================================================

function obtenerURLCSV() {

    const temporada = obtenerTemporadaActual();

    const config = TEMPORADA_CSV_GIDS[temporada];

    if (!config) {

        throw new Error(
            `No existe configuración para la temporada ${temporada}`
        );

    }

    return `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?gid=${config.partidos}&single=true&output=csv`;

}


// =======================================================
// FORMATO ICS
// =======================================================

function dos(numero) {

    return String(numero).padStart(2, "0");

}

function fechaICS(año, mes, dia, hora, minuto) {

    return `${año}${dos(mes)}${dos(dia)}T${dos(hora)}${dos(minuto)}00`;

}

// =======================================================
// ESCAPAR TEXTO ICS
// =======================================================

function escaparICS(texto) {

    return String(texto || "")

        .replace(/\\/g, "\\\\")

        .replace(/\n/g, "\\n")

        .replace(/,/g, "\\,")

        .replace(/;/g, "\\;");

}

// =======================================================
// DESCARGAR CSV
// =======================================================

async function descargarCSV() {

    console.log("");

    console.log("====================================");

    console.log("📥 Descargando CSV...");

    console.log("====================================");

    const respuesta = await fetch(obtenerURLCSV());

    if (!respuesta.ok) {

        throw new Error(
            `No se pudo descargar el CSV (${respuesta.status})`
        );

    }

    const csv = await respuesta.text();

    console.log("✅ CSV descargado correctamente.");

    return csv;

}


// =======================================================
// CONVERTIR CSV A JSON
// =======================================================

function convertirCSVaJSON(csv) {

    const resultado = Papa.parse(csv, {

        header: true,

        skipEmptyLines: true

    });

    const partidos = resultado.data;

    console.log(`📄 ${partidos.length} partidos leídos.`);

    return partidos;

}


// =======================================================
// PARTIDOS DE LAS PISTAS
// =======================================================

function obtenerPartidosCalendario(partidos) {

    const partidosEquipo = partidos.filter(partido =>

        partido.local === MI_EQUIPO ||

        partido.visitante === MI_EQUIPO

    );

    console.log("");

    console.log(`⚽ ${partidosEquipo.length} partidos de ${MI_EQUIPO}.`);

    return partidosEquipo;

}

// =======================================================
// GENERAR ARCHIVO ICS
// =======================================================

function generarICS(partidos) {

    let ics = "";

    ics += "BEGIN:VCALENDAR\r\n";
    ics += "VERSION:2.0\r\n";
    ics += "PRODID:-//Las Pistas FC//Calendario//ES\r\n";
    ics += "CALSCALE:GREGORIAN\r\n";
    ics += "METHOD:PUBLISH\r\n";
    ics += "X-WR-CALNAME:Las Pistas FC\r\n";
    ics += "X-WR-TIMEZONE:Europe/Madrid\r\n";

    ics += "BEGIN:VTIMEZONE\r\n";
    ics += "TZID:Europe/Madrid\r\n";

    ics += "BEGIN:DAYLIGHT\r\n";
    ics += "TZOFFSETFROM:+0100\r\n";
    ics += "TZOFFSETTO:+0200\r\n";
    ics += "TZNAME:CEST\r\n";
    ics += "DTSTART:19700329T020000\r\n";
    ics += "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\n";
    ics += "END:DAYLIGHT\r\n";

    ics += "BEGIN:STANDARD\r\n";
    ics += "TZOFFSETFROM:+0200\r\n";
    ics += "TZOFFSETTO:+0100\r\n";
    ics += "TZNAME:CET\r\n";
    ics += "DTSTART:19701025T030000\r\n";
    ics += "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\n";
    ics += "END:STANDARD\r\n";

    ics += "END:VTIMEZONE\r\n";

    for (const partido of partidos) {

        const [dia, mes, año] =
            partido.fecha.split("/").map(Number);

        const [hora, minuto] =
            partido.hora.split(":").map(Number);

        //------------------------------------------
        // Hora de finalización
        //------------------------------------------

        let finHora = hora;
        let finMinuto = minuto + DURACION_PARTIDO;

        while (finMinuto >= 60) {

            finHora++;

            finMinuto -= 60;

        }

        //------------------------------------------
        // UID
        //------------------------------------------

        const uid =
            `partido-${partido.id}@pedrovalcarcel.github.io`;

        //------------------------------------------
        // Título
        //------------------------------------------

        const titulo =
            `⚽ Jornada ${partido.jornada} · ${partido.local} - ${partido.visitante}`;

        //------------------------------------------
        // Descripción
        //------------------------------------------

        let descripcion = "";

        descripcion += `Jornada ${partido.jornada}\\n\\n`;

        descripcion += `🏠 Local: ${partido.local}\\n`;

        descripcion += `🚌 Visitante: ${partido.visitante}\\n\\n`;

        descripcion += `📍 Campo: ${partido.campo || "Por confirmar"}\\n`;

        descripcion += `🕒 Hora: ${partido.hora}\\n`;

        descripcion += `👨‍⚖️ Árbitro: ${partido.arbitro || "Por confirmar"}\\n\\n`;

        descripcion += `📄 Acta:\\n`;

        descripcion += `${URL_WEB}/detalle_partido.html?id=${partido.id}\\n\\n`;

        descripcion += `🌐 ${URL_WEB}`;

        //------------------------------------------
        // Evento
        //------------------------------------------

        ics += "BEGIN:VEVENT\r\n";

        ics += `UID:${uid}\r\n`;

        ics += `SUMMARY:${escaparICS(titulo)}\r\n`;

        ics += `DTSTAMP:${fechaICS(año, mes, dia, 0, 0)}Z\r\n`;

        ics += `DTSTART;TZID=Europe/Madrid:${fechaICS(año, mes, dia, hora, minuto)}\r\n`;

        ics += `DTEND;TZID=Europe/Madrid:${fechaICS(año, mes, dia, finHora, finMinuto)}\r\n`;

        ics += `LOCATION:${escaparICS(partido.campo)}\r\n`;

        ics += `DESCRIPTION:${escaparICS(descripcion)}\r\n`;

        ics += "STATUS:CONFIRMED\r\n";

        ics += "END:VEVENT\r\n";

    }

    ics += "END:VCALENDAR\r\n";

    return ics;

}

// =======================================================
// GUARDAR ARCHIVO ICS
// =======================================================

async function generarArchivoICS(partidos) {

    const contenido = generarICS(partidos);

    fs.writeFileSync(
        "laspistasfc_calendario.ics",
        contenido,
        "utf8"
    );

    console.log("");

    console.log("====================================");

    console.log("✅ Calendario generado correctamente");

    console.log("====================================");

    console.log(`📅 Eventos: ${partidos.length}`);

    console.log("📄 Archivo: calendario.ics");

    console.log("");

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

        const csv = await descargarCSV();

        const partidos = convertirCSVaJSON(csv);

        const partidosCalendario =
            obtenerPartidosCalendario(partidos);

        await generarArchivoICS(partidosCalendario);

        console.log("");

        console.log("====================================");

        console.log("🎉 PROCESO FINALIZADO");

        console.log("====================================");

        console.log(`Temporada: ${obtenerTemporadaActual()}`);

        console.log(`Partidos leídos: ${partidos.length}`);

        console.log(`Eventos generados: ${partidosCalendario.length}`);

        console.log("");

    }

    catch (error) {

        console.error("");

        console.error("❌ ERROR");

        console.error(error);

        process.exit(1);

    }

})();
