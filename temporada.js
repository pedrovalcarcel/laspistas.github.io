const SPREADSHEET_ID = "2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C";

const TEMPORADA_CSV_GIDS = {
    "2025/26": {
        partidos: 0,
        eventos: 1785101781
    },
    "2026/27": {
        partidos: 529616834,
        eventos: 644906735
    }
};

function obtenerTemporadaActualCsv() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;

    if (mes >= 9) {
        return `${año}/${String(año + 1).slice(-2)}`;
    }

    return `${año - 1}/${String(año).slice(-2)}`;
}

function obtenerUrlPartidosTemporada(temporada) {
    const gid = obtenerGidTemporada(temporada, "partidos");
    if (gid === null) {
        console.warn(`No se encontró CSV de partidos para la temporada ${temporada}. Se usa el CSV por defecto.`);
        return urlCSV(0);
    }
    return urlCSV(gid);
}

function obtenerUrlEventosTemporada(temporada) {
    const gid = obtenerGidTemporada(temporada, "eventos");
    if (gid === null) {
        console.warn(`No se encontró CSV de eventos para la temporada ${temporada}. Se usa el CSV por defecto.`);
        return urlCSV(1785101781);
    }
    return urlCSV(gid);
}

function fechaEnTemporada(fecha, temporada) {
    if (!fecha || !temporada) return false;
    const [dia, mes, ano] = fecha.split("/").map(Number);
    if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(ano)) {
        return false;
    }

    const fechaPartido = new Date(ano, mes - 1, dia);
    const [temporadaInicio, temporadaFinAnyo] = temporada.split("/");
    if (!temporadaInicio || !temporadaFinAnyo) return false;

    const inicio = new Date(Number(temporadaInicio), 8, 1); // 1 de septiembre
    const fin = new Date(Number(temporadaInicio) + 1, 8, 1); // 1 de septiembre del siguiente año

    return fechaPartido >= inicio && fechaPartido < fin;
}

function filtrarPartidosPorTemporada(partidos, temporada) {
    if (!Array.isArray(partidos)) return [];
    const tieneTemporada = partidos.some(p => p && p.temporada);
    if (tieneTemporada) {
        return partidos.filter(p => String(p.temporada || "").trim() === temporada);
    }
    return partidos.filter(p => fechaEnTemporada(p.fecha, temporada));
}

function urlCSV(gid) {
    if (gid === undefined || gid === null) {
        return null;
    }
    return `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
}

function obtenerGidTemporada(temporada, tipo = "partidos") {
    const temporadaConfig = TEMPORADA_CSV_GIDS[temporada];
    return temporadaConfig && temporadaConfig[tipo] !== undefined
        ? temporadaConfig[tipo]
        : null;
}

function obtenerUrlPartidosTemporadaActual() {
    return obtenerUrlPartidosTemporada(obtenerTemporadaActualCsv());
}

function obtenerUrlEventosTemporadaActual() {
    return obtenerUrlEventosTemporada(obtenerTemporadaActualCsv());
}

function filtrarTemporadaActual(partidos) {
    return filtrarPartidosPorTemporada(partidos, obtenerTemporadaActualCsv());
}

