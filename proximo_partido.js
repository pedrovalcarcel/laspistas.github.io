fetchCSV(obtenerUrlPartidosTemporadaActual())
.then(partidos=>{
    const partidosTemporada = filtrarTemporadaActual(partidos);
    console.log(partidosTemporada);
    const proximo = partidosTemporada
        .filter(p =>
            (String(p.local || "").trim() === MI_EQUIPO ||
            String(p.visitante || "").trim() === MI_EQUIPO) &&
            p.goles_local.trim() === "" &&
            p.fecha
        )
        .sort((a,b)=>{
            const fa = new Date(a.fecha.split("/").reverse().join("-"));
            const fb = new Date(b.fecha.split("/").reverse().join("-"));
            return fa-fb;
        })[0];
    const contenedorProximo = document.getElementById("proximo-partido");
    if(!proximo){
        if (contenedorProximo) contenedorProximo.textContent = "No hay partidos programados.";
        return;
    }

    const fecha = new Date(
    proximo.fecha.split("/").reverse().join("-")
    );

    const dias = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado"
    ];

    const meses = [
        "enero","febrero","marzo","abril","mayo","junio",
        "julio","agosto","septiembre","octubre","noviembre","diciembre"
    ];

    const fechaTexto =
        `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;

    let competicion;
    if (!isNaN(proximo.jornada)) {
        competicion = `Liga · Jornada ${proximo.jornada}`;
    } else {
        competicion = `${proximo.jornada}`;
    }

    if (!contenedorProximo) return;
    contenedorProximo.innerHTML = `
    <a class="tarjeta-proximo" href="partido.html?id=${proximo.id}">

        <div class="fecha">
            ${fechaTexto}
        </div>

        <div class="competicion">
            ${competicion}
        </div>

        <div class="equipos">
            <div>${proximo.local}</div>

            <div class="vs">VS</div>

            <div>${proximo.visitante}</div>
        </div>

        <div class="info-partido">
            <span>${proximo.hora}</span>
            <span>${proximo.campo}</span>
        </div>

    </a>
    `;

}).catch(error => {
    console.error("Error al cargar el próximo partido:", error);
    const contenedor = document.getElementById("proximo-partido");
    if (contenedor) contenedor.textContent = "No se pudo cargar el próximo partido.";
});

