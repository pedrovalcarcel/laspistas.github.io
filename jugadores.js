const params = new URLSearchParams(window.location.search);
const dorsal = params.get("dorsal");

fetch("resultados.json")
    .then(res => res.json())
    .then(data => {
        const jugadores = data.jugadores;
        const partidos = data.partidos;
        const stats ={};
        const contenedor = document.getElementById("lista-jugadores");
        jugadores.sort((a, b) => parseInt(a.dorsal) - parseInt(b.dorsal));
        jugadores.forEach(jugador => {
            stats[jugador.dorsal] = {
                dorsal: jugador.dorsal,
                nombre: jugador.nombre,
                alias: jugador.alias,
                goles: 0,
                asistencias: 0
            };
            const li = document.createElement("li");
            li.classList.add("enlace-jugador");
            li.innerHTML = `<a href="jugador.html?dorsal=${jugador.dorsal}">${jugador.dorsal} - ${jugador.alias}</a>`;
            contenedor.appendChild(li);
        });
        partidos.forEach(partido => {
            partido.goles.forEach(gol => {
                if (stats[gol.dorsal]) {
                    stats[gol.dorsal].goles += gol.cantidad;
                }
            });
            partido.asistencias.forEach(asistencia => {
                if (stats[asistencia.asistente]) {
                    stats[asistencia.asistente].asistencias += 1;
                }
            });
        });
        // Convertir a array
        const jugadoresStats = Object.values(stats);
        pintarRanking("ranking-goles", jugadoresStats.sort((a, b) => b.goles - a.goles), j => j.goles);
        pintarRanking("ranking-asistencias", jugadoresStats.sort((a, b) => b.asistencias - a.asistencias), j => j.asistencias);
        pintarRanking("ranking-total", jugadoresStats.sort((a, b) => (b.goles + b.asistencias) - (a.goles + a.asistencias)), j => j.goles + j.asistencias);
        function pintarRanking(id, ranking, valor) {
            const ul = document.getElementById(id);
            ul.innerHTML = "";
            ranking.forEach((j, i) => {
                if ((typeof valor === "function" ? valor(j) : j[valor]) >= 0) {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <strong>${i + 1}.</strong>
                        <a href="jugador.html?dorsal=${j.dorsal}">
                            ${j.jugador}
                        </a> : ${typeof valor === "function" ? valor(j) : j[valor]}
                    `;
                    ul.appendChild(li);
             }
            });
        }
    });




