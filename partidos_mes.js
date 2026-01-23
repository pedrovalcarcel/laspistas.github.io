fetch("resultados.json")
.then(res => res.json())
.then(data => {
    const ul = document.getElementById("partidos-mes");
    const mesActual = new Date().getMonth();
    const diaHoy = new Date().getDate();
    const anoActual = new Date().getFullYear();

    data.partidos.forEach(p => {
        const fecha = new Date(p.fecha.split("/").reverse().join("-"));
        if (fecha.getMonth() === (mesActual) && fecha.getUTCDate() > diaHoy && anoActual <= fecha.getFullYear() || fecha.getMonth() > (mesActual) & anoActual <= fecha.getFullYear()) {
            const li = document.createElement("li");
            li.innerHTML = `
            <a href="partido.html?id=${p.id}">
                J: ${p.jornada} - ${p.local} VS ${p.visitante} : ${obtenerDiaSemana(p.fecha)} ${p.fecha} , ${p.hora} , ${p.campo}
            </a>`;
            ul.appendChild(li);
        }
    });

});
function obtenerDiaSemana(fecha) {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const [dia,mes,ano] = fecha.split("/").map(Number);
  const date = new Date(ano, mes - 1, dia); // Crea un objeto Date a partir de la fecha
  return dias[date.getDay()]; // Devuelve el nombre del día
  }


