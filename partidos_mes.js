fetch("resultados.json")
  .then(res => res.json())
  .then(data => {

    const contenedor = document.getElementById("partidos-mes");

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anoActual = hoy.getFullYear();

    const mesSiguiente = (mesActual + 1) % 12;
    const anoSiguiente = mesActual === 11 ? anoActual + 1 : anoActual;

    // Limpiar por si acaso
    contenedor.innerHTML = "";

    // Calendario mes actual
    crearCalendario(anoActual, mesActual, data.partidos, contenedor);

    // Calendario mes siguiente
    crearCalendario(anoSiguiente, mesSiguiente, data.partidos, contenedor);
  });

function crearCalendario(ano, mes, partidos, contenedor) {

  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mesHoy = hoy.getMonth();
  const anoHoy = hoy.getFullYear();

  const nombresMeses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const calendario = document.createElement("div");
  calendario.className = "calendario";

  calendario.innerHTML = `<h3>${nombresMeses[mes]} ${ano}</h3>`;

  const grid = document.createElement("div");
  grid.className = "grid-calendario";

  const primerDia = new Date(ano, mes, 1).getDay();
  const diasMes = new Date(ano, mes + 1, 0).getDate();

  // Huecos antes del día 1 (lunes inicio)
  for (let i = 0; i < (primerDia === 0 ? 6 : primerDia - 1); i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasMes; dia++) {

    const celda = document.createElement("div");
    celda.className = "dia";

    // 👉 Marcar día actual
    if (dia === diaHoy && mes === mesHoy && ano === anoHoy) {
      celda.classList.add("hoy");
    }

    celda.innerHTML = `<strong>${dia}</strong>`;

    const fechaStr = `${String(dia).padStart(2,"0")}/${String(mes+1).padStart(2,"0")}/${ano}`;

    partidos
      .filter(p => {
        const fechaPartido = fechaDesdeString(p.fecha);
        return (
            fechaPartido.getDate() === dia &&
            fechaPartido.getMonth() === mes &&
            fechaPartido.getFullYear() === ano
        );
        })
      .forEach(p => {
        const partido = document.createElement("div");
        partido.className = "partido";
        partido.innerHTML = `
          <a href="partido.html?id=${p.id}">
            ${p.hora} · ${p.campo}
          </a>
        `;
        celda.appendChild(partido);
      });

    grid.appendChild(celda);
  }

  calendario.appendChild(grid);
  contenedor.appendChild(calendario);
}

function fechaDesdeString(fecha) {
  const [dia, mes, ano] = fecha.split("/");
  return new Date(ano, mes - 1, dia);
}





