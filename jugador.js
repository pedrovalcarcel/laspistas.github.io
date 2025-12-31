const params = new URLSearchParams(window.location.search);
const dorsal = params.get("dorsal");

fetch("resultados.json")
    .then(res => res.json())
    .then(data => {
        const jugadores = data.jugadores;
        const partidos = data.partidos;
        const jugador = jugadores.find(j => j.dorsal === dorsal);
        const contenedor = document.getElementById("pagina-jugador");
        if (!jugador) {
            contenedor.textContent = "Jugador no encontrado.";
            return;
        }
        const titulo = document.getElementById("nombre-jugador");
        titulo.textContent = `${jugador.dorsal} - ${jugador.nombre}`;
        let goles = 0;
        let asistencias = 0;
        let gya_x_partido = 0;
        let tarjetas = 0;
        let partidosJugados = 0;
        partidos.forEach(p => {
            if (p.jugadores.includes(dorsal)) {
                partidosJugados += 1;
            }
            p.goles.forEach(g => {
                if (g.dorsal === dorsal) {
                    goles += g.cantidad;
                }
            });
            p.asistencias.forEach(a => {
                if (a.asistente === dorsal) {
                    asistencias += 1;
                }
            });
            p.tarjetas.forEach(t => {
                if (t.dorsal === dorsal) {
                    tarjetas += 1;
                }
            });
        });
        gya_x_partido = (goles + asistencias) / partidosJugados;
        contenedor.innerHTML = `
            <h1>Estadísticas</h1>
            <ul>
                <li>Partidos jugados: ${partidosJugados}</li>
                <li>Goles: ${goles}</li>
                <li>Asistencias: ${asistencias}</li>
                <li>G/A por partido: ${gya_x_partido.toFixed(2)}</li>
                <li>Tarjetas: ${tarjetas}</li>
            </ul>
        `;
    });