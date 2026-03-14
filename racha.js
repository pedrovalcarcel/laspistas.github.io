// URL de tu CSV de partidos publicado
const urlPartidos = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv";
const MI_EQUIPO3 = "Las Pistas FC"; 

fetch(urlPartidos)
    .then(res => res.text())
    .then(csvText => {
        const partidos = csvToJSON(csvText);
        // Filtramos partidos terminados y quitamos amistosos
        const partidosOficiales = partidos.filter(p => 
            p.jornada !== "Amistoso" && 
            p.goles_local !== "" && 
            (p.local.trim() === MI_EQUIPO3.trim() || p.visitante.trim() === MI_EQUIPO3.trim())
        );
        const ultimos5 = partidosOficiales.slice(-5);

        const rachaHTML = ultimos5.map((p, index) => {
    const esLocal = p.local.trim() === MI_EQUIPO3.trim();
    const golesFavor = esLocal ? parseInt(p.goles_local) : parseInt(p.goles_visitante);
    const golesContra = esLocal ? parseInt(p.goles_visitante) : parseInt(p.goles_local);
    
    // Asignamos las letras v, e, d según tu CSS
    let clase = golesFavor > golesContra ? "v" : (golesFavor < golesContra ? "d" : "e");
    
    // Añadimos 'ultimo' solo al último elemento de la lista (el más reciente)
    const esUltimo = index === ultimos5.length - 1 ? "ultimo" : "";
    
    return `
        <a href="partido.html?id=${p.id}" title="Jornada ${p.jornada}: ${p.local} ${p.goles_local}-${p.goles_visitante} ${p.visitante}" style="text-decoration: none;">
                <div class="cuadrado-resultado ${clase} ${esUltimo}">
                    ${clase.toUpperCase()}
                </div>
            </a>`;
}).join("");

// Asegúrate de que el contenedor tenga la clase 'racha' que definiste en CSS
document.getElementById("racha").className = "racha"; 
document.getElementById("racha").innerHTML = rachaHTML;
    });

// Función necesaria para leer el CSV
function csvToJSON(csv) {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(l => l.trim() !== "").map(line => {
        const values = line.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : "");
        return obj;
    });
}

// racha.js - SOLO funciones, nada de código que se ejecute solo
function generarHTMLRacha(nombreEquipo, todosLosPartidos, fechaPartido) {
    if (!fechaPartido) return "";

    const fechaLimite = new Date(fechaPartido.split('/').reverse().join('-'));

    const partidosEquipo = todosLosPartidos
        .filter(p => {
            if (!p.fecha) return false;
            const fechaP = new Date(p.fecha.split('/').reverse().join('-'));
            return p.goles_local !== "" && 
                   fechaP < fechaLimite && 
                   (p.local.trim() === nombreEquipo.trim() || p.visitante.trim() === nombreEquipo.trim());
        })
        .sort((a, b) => new Date(b.fecha.split('/').reverse().join('-')) - new Date(a.fecha.split('/').reverse().join('-')))
        .slice(0, 5);

    const ultimos5 = partidosEquipo.reverse();

    return ultimos5.map((p, index) => {
        const esUltimo = index === (ultimos5.length - 1) ? "ultimo" : "";
        const esLocal = p.local.trim() === nombreEquipo.trim();
        const golesFavor = esLocal ? parseInt(p.goles_local) : parseInt(p.goles_visitante);
        const golesContra = esLocal ? parseInt(p.goles_visitante) : parseInt(p.goles_local);
        
        let clase = golesFavor > golesContra ? "v" : (golesFavor < golesContra ? "d" : "e");
        
        // AQUÍ ESTÁ EL CAMBIO: Envolvemos el div en un enlace <a>
        return `
            <a href="partido.html?id=${p.id}" title="Jornada ${p.jornada}: ${p.local} ${p.goles_local}-${p.goles_visitante} ${p.visitante}" style="text-decoration: none;">
                <div class="cuadrado-resultado ${clase} ${esUltimo}">
                    ${clase.toUpperCase()}
                </div>
            </a>`;
    }).join("");
}