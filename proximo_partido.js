fetch(obtenerUrlPartidosTemporadaActual())
.then(r=>r.text())
.then(csv=>{
    const partidos = csvToJSON(csv);
    const partidosTemporada = filtrarTemporadaActual(partidos);
    console.log(partidosTemporada);
    const hoy = new Date();

    const proximo = partidosTemporada
        .filter(p =>
            (p.local.trim() === MI_EQUIPO ||
            p.visitante.trim() === MI_EQUIPO) &&
            p.goles_local.trim() === "" &&
            p.fecha
        )
        .sort((a,b)=>{
            const fa = new Date(a.fecha.split("/").reverse().join("-"));
            const fb = new Date(b.fecha.split("/").reverse().join("-"));
            return fa-fb;
        })[0];
        console.log("Proximo partido", proximo);
    if(!proximo){
        document.getElementById("proximo-partido").innerHTML=
        "<p>No hay partidos programados.</p>";
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

    document.getElementById("proximo-partido").innerHTML = `
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

});

function csvToJSON(csv){
    const lines=csv.split("\n");
    const headers=lines[0]
        .split(",")
        .map(h=>h.trim().toLowerCase());
    return lines.slice(1)
        .filter(l=>l.trim()!=="")
        .map(line=>{
            const values=line.split(",");
            const obj={};
            headers.forEach((h,i)=>{
                obj[h]=values[i] ? values[i].trim() : "";
            });
            return obj;
        });

}