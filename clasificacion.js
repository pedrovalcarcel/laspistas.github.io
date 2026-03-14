// clasificacion.js
const urlPartidosC = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C/pub?gid=0&single=true&output=csv";

fetch(urlPartidosC)
    .then(res => res.text())
    .then(csvText => {
        const partidos = csvToJSON(csvText);
        // Filtrar solo partidos oficiales ya jugados
        const partidosOficiales = partidos.filter(p => p.jornada !== "Amistoso" && p.goles_local !== "");
        
        // Calcular clasificación (asumiendo que tienes esta función en tu proyecto)
        const tabla = calcularClasificacion(partidosOficiales);
        
        // Convertir a array y ordenar
        const tablaArray = Object.keys(tabla).map(nombre => ({
            equipo: nombre,
            ...tabla[nombre],
            ga: tabla[nombre].gf - tabla[nombre].gc // Diferencia de goles
        })).sort((a, b) => b.pts - a.pts || b.ga - a.ga);

        // Imprimir en el tbody
        const tbody = document.getElementById("cuerpo-clasificacion");
            tbody.innerHTML = tablaArray.map((eq, i) => {
                
                // Lógica para decidir el enlace
                let enlace;
                if (eq.equipo.trim() === "Las Pistas FC") {
                    enlace = "estadisticas.html"; // Tu página de estadísticas original
                } else {
                    enlace = `equipo.html?nombre=${encodeURIComponent(eq.equipo)}`;
                }

                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>
                            <a href="${enlace}" class="link-equipo">${eq.equipo}</a>
                        </td>
                        <td>${eq.pj}</td>
                        <td>${eq.pg}</td>
                        <td>${eq.pe}</td>
                        <td>${eq.pp}</td>
                        <td>${eq.gf}</td>
                        <td>${eq.gc}</td>
                        <td>${eq.ga > 0 ? '+' : ''}${eq.ga}</td>
                        <td><b>${eq.pts}</b></td>
                    </tr>
                `;
            }).join("");
    });

// Asegúrate de que esta función esté disponible globalmente o importada
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