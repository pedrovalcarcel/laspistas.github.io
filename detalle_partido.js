function buscarJugador(dorsal, jugadores){
    return jugadores.find(j => j.dorsal === dorsal);
}
function ordenarDorsales(dorsales){
    return dorsales.sort((a, b) => parseInt(a) - parseInt(b));
}
const params = new URLSearchParams(window.location.search);
const partidoId = parseInt(params.get("id"));

fetch("resultados.json")
  .then(res => res.json())
  .then(data => {
    const jugadores = data.jugadores;
    const partidos = data.partidos;
    const partido = partidos.find(p => p.id === partidoId);
    if (!partido) {
        contenedor.textContent = "Partido no encontrado.";
        return;
    }
    const contenedor = document.getElementById("pagina-detalle-partido");
    const titulo = document.getElementById("titulo-partido");
    titulo.textContent = `Jornada ${partido.jornada}: ${partido.local} ${partido.goles_local} - ${partido.goles_visitante} ${partido.visitante}`;

    
    const dorsalesOrdenados = ordenarDorsales(partido.jugadores);
    contenedor.innerHTML = `
        <p>📅  ${obtenerDiaSemana(partido.fecha)} ${partido.fecha} ⏰ ${partido.hora}</p>
        <p>📍 Campo: ${partido.campo} 👨‍⚖️ Arbitro: ${partido.arbitro}</p>

        <h2>Jugadores</h2>
          ${`<ul>` + dorsalesOrdenados.map(j => {
            const jugador = buscarJugador(j, jugadores);
            return `<li><a href = "jugador.html?dorsal=${jugador.dorsal}">${jugador.dorsal} - ${jugador.alias}</a></li>`;
          }).join("") + `</ul>`}

        <h3>Goles</h3>
        ${partido.goles.length === 0 ? "Sin goles" : `<ul>` + partido.goles.map(g => {
            const jugador = buscarJugador(g.dorsal, jugadores);
            return `<li>${jugador.alias} (${g.cantidad})</li>`;
        }).join("") + `</ul>`}
        <h3>Asistencias</h3>
        ${partido.asistencias.length === 0 ? "Sin asistencias" : `<ul>` + partido.asistencias.map(a => {
            const asistente = buscarJugador(a.asistente, jugadores);
            const goleador = buscarJugador(a.goleador, jugadores);
            return `<li>${asistente.alias} a ${goleador.alias}</li>`;
        }).join("") + `</ul>`}
        <h3>Tarjetas</h3>
        ${partido.tarjetas.length === 0 ? "Sin tarjetas" : `<ul>` + partido.tarjetas.map(t => {
            const jugador = buscarJugador(t.dorsal, jugadores);
            return `<li>${jugador.alias} </li>`;
        }
        ).join("") + `</ul>`}
    `;
  },
  

);
function obtenerDiaSemana(fecha) {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const [dia,mes,ano] = fecha.split("/").map(Number);
  const date = new Date(ano, mes - 1, dia); // Crea un objeto Date a partir de la fecha
  return dias[date.getDay()]; // Devuelve el nombre del día
  }

