// ===============================
// CONFIGURACIÓN
// ===============================

const urlPartidos = obtenerUrlPartidosTemporadaActual();

const MI_EQUIPO = "Las Pistas FC";


// ================================
// PORTADA (INDEX)
// ================================

fetchCSV(urlPartidos)
.then(partidos => {
    const hoy = new Date();
    // Últimos 5 partidos oficiales disputados
    const ultimos5 = partidos
        .filter(p =>
            p.jornada !== "Amistoso" &&
            partidoJugado(p) &&
            partidoEnElPasado(p, hoy) &&
            (
                p.local.trim() === MI_EQUIPO ||
                p.visitante.trim() === MI_EQUIPO
            )
        )
        .slice(-5);
    const html = ultimos5.map((p, index) => {
        const esLocal = p.local.trim() === MI_EQUIPO;
        const gf = esLocal
            ? Number(p.goles_local)
            : Number(p.goles_visitante);
        const gc = esLocal
            ? Number(p.goles_visitante)
            : Number(p.goles_local);
       let clase = "racha-e";
        let letra = "E";

        if (gf > gc) {
            clase = "racha-v";
            letra = "V";
        }

        if (gf < gc) {
            clase = "racha-d";
            letra = "D";
        }

        return `
            <a href="partido.html?id=${p.id}" style="text-decoration:none;">
                <div class="partido-racha ${clase}" data-id="${p.id}">
                    ${letra}
                </div>
            </a>
        `;

    }).join("");
    const contenedorRacha = document.getElementById("racha");

    if (contenedorRacha) {
        contenedorRacha.innerHTML = html;

        if (typeof activarTooltipsRacha === "function") {
            activarTooltipsRacha(contenedorRacha, partidos);
        }
    }
    }).catch(error => {
        console.error("Error al cargar la racha:", error);
        const contenedor = document.getElementById("racha");
        if (contenedor) contenedor.textContent = "No se pudo cargar la racha reciente.";
    });
// ================================
// FUNCIÓN PARA OTRAS PÁGINAS
// ================================

function generarHTMLRacha(nombreEquipo, todosLosPartidos, fechaPartido){
    if(!fechaPartido) return "";
    const fechaLimite = new Date(
        fechaPartido.split("/").reverse().join("-")
    );

    const ultimos5 = todosLosPartidos
        .filter(p=>{
            if(!p.fecha || !partidoJugado(p)) return false;
            const fecha = new Date(
                p.fecha.split("/").reverse().join("-")
            );
            return fecha < fechaLimite &&
                (
                    p.local.trim()===nombreEquipo.trim() ||
                    p.visitante.trim()===nombreEquipo.trim()
                );
        })
        .sort((a,b)=>
            new Date(a.fecha.split("/").reverse().join("-"))-
            new Date(b.fecha.split("/").reverse().join("-"))
        )
        .slice(-5);
    return ultimos5.map((p,index)=>{
        const esLocal = p.local.trim()===nombreEquipo.trim();
        const gf = esLocal
            ? Number(p.goles_local)
            : Number(p.goles_visitante);
        const gc = esLocal
            ? Number(p.goles_visitante)
            : Number(p.goles_local);
        let clase = "racha-e";
        let letra = "E";

        if (gf > gc) {
            clase = "racha-v";
            letra = "V";
        }

        if (gf < gc) {
            clase = "racha-d";
            letra = "D";
        }

        return `
            <a href="partido.html?id=${p.id}" style="text-decoration:none;">
                <div class="partido-racha ${clase}" data-id="${p.id}">
                    ${letra}
                </div>
            </a>
        `;
    }).join("");

}


// ================================
// CSV -> JSON
// ================================

function partidoJugado(partido) {
    return partido &&
        partido.goles_local !== "" &&
        partido.goles_visitante !== "" &&
        !isNaN(Number(partido.goles_local)) &&
        !isNaN(Number(partido.goles_visitante));
}

function partidoEnElPasado(partido, referencia) {
    if (!partido || !partido.fecha) return false;
    const fecha = new Date(partido.fecha.split("/").reverse().join("-"));
    return !isNaN(fecha.getTime()) && fecha < referencia;
}
