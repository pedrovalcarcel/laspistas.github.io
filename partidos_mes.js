const csvUrl = obtenerUrlPartidosTemporadaActual();

fetch(csvUrl)
.then(r => r.text())
.then(csv => {

    const partidosRaw = csvToJSON(csv);
    const partidos = filtrarTemporadaActual(partidosRaw).filter(p =>
        p.local.trim() === MI_EQUIPO ||
        p.visitante.trim() === MI_EQUIPO
    );

    crearTooltip();

    const hoy = new Date();

    // Mes actual
    crearCalendario(
        hoy.getFullYear(),
        hoy.getMonth(),
        partidos,
        document.getElementById("calendario-actual"),
        "titulo-calendario-actual"
    );

    // Mes siguiente
    const mesSiguiente = hoy.getMonth() === 11 ? 0 : hoy.getMonth() + 1;
    const anoSiguiente = hoy.getMonth() === 11
        ? hoy.getFullYear() + 1
        : hoy.getFullYear();

    crearCalendario(
        anoSiguiente,
        mesSiguiente,
        partidos,
        document.getElementById("calendario-siguiente"),
        "titulo-calendario-siguiente"
    );

});

function crearTooltip(){

    tooltip = document.createElement("div");
    tooltip.className = "tooltip-calendario";
    document.body.appendChild(tooltip);

}