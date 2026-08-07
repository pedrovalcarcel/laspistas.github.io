let tooltip;

function crearTooltip(){
    if(document.querySelector(".tooltip-calendario")){
        tooltip=document.querySelector(".tooltip-calendario");
        return;
    }
    tooltip=document.createElement("div");
    tooltip.className="tooltip-calendario";
    document.body.appendChild(tooltip);

}

function fechaDesdeString(fecha){
    const [d,m,a]=fecha.split("/");
    return new Date(a,m-1,d);
}

function csvToJSON(csv){
    const lines=csv.split("\n");
    const headers=lines[0]
        .split(",")
        .map(h=>h.trim().toLowerCase());
    return lines
        .slice(1)
        .filter(l=>l.trim()!=="")
        .map(line=>{
            const values=line.split(",");
            const obj={};
            headers.forEach((h,i)=>{
                obj[h]=values[i]
                    ? values[i].trim()
                    : "";

            });
            return obj;
        });

}

function obtenerTemporadaActual(){
    const hoy = new Date();
    const ano = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;

    if (mes >= 9) {
        return `${ano}/${String(ano + 1).slice(-2)}`;
    }

    return `${ano - 1}/${String(ano).slice(-2)}`;
}

function fechaEnTemporada(fecha, temporada){
    if (!fecha || !temporada) return false;
    const [dia, mes, ano] = fecha.split("/").map(Number);
    if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(ano)) {
        return false;
    }

    const fechaPartido = new Date(ano, mes - 1, dia);
    const [temporadaInicio, temporadaFinAnyo] = temporada.split("/");
    if (!temporadaInicio || !temporadaFinAnyo) return false;

    const inicio = new Date(Number(temporadaInicio), 8, 1); // 1 de septiembre
    const fin = new Date(Number(temporadaInicio) + 1, 8, 1); // 1 de septiembre del siguiente año

    return fechaPartido >= inicio && fechaPartido < fin;
}

function filtrarPartidosPorTemporadaActual(partidos){
    if (!Array.isArray(partidos)) return partidos;
    const temporadaActual = obtenerTemporadaActual();
    const tieneTemporada = partidos.some(p => p && p.temporada);

    if (tieneTemporada) {
        return partidos.filter(p => String(p.temporada || "").trim() === temporadaActual);
    }

    return partidos.filter(p => fechaEnTemporada(p.fecha, temporadaActual));
}

function crearCalendario(ano, mes, partidos, contenedor, idTitulo){
    const meses = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    // Título del calendario
    if(idTitulo){
        document.getElementById(idTitulo).textContent =
            `${meses[mes]} ${ano}`;
    }
    // Limpiamos el contenedor
    contenedor.innerHTML = "";
    // Creamos la cuadrícula
    const grid = document.createElement("div");
    grid.className = "grid-calendario";
    // Cabecera de los días
    const diasSemana = ["L","M","X","J","V","S","D"];
    diasSemana.forEach(dia => {
        const cabecera = document.createElement("div");
        cabecera.className = "cabecera-dia";
        cabecera.textContent = dia;
        grid.appendChild(cabecera);
    });
    // Día en el que empieza el mes
    const primerDia = new Date(ano, mes, 1).getDay();
    const offset = primerDia === 0 ? 6 : primerDia - 1;
    // Huecos antes del día 1
    for(let i = 0; i < offset; i++){
        const vacio = document.createElement("div");
        grid.appendChild(vacio);
    }
    //Número de días del mes
    const diasMes = new Date(ano, mes + 1, 0).getDate();
    //Crear todos los días
    for(let dia = 1; dia <= diasMes; dia++){
        const celda = document.createElement("div");
        celda.className = "dia";
        celda.textContent = dia;
        //Resaltar el día de hoy
        const hoy = new Date();
        if(
            dia === hoy.getDate() &&
            mes === hoy.getMonth() &&
            ano === hoy.getFullYear()
        ){

            celda.classList.add("hoy");

        }

        // Buscar si existe un partido ese día

const partido = partidos.find(p => {

    if(!p.fecha) return false;

    const f = fechaDesdeString(p.fecha);

    return (
        f.getDate() === dia &&
        f.getMonth() === mes &&
        f.getFullYear() === ano
    );

});

    if(partido){
        celda.classList.add("dia-partido");
        if(partido.goles_local !== "" && partido.goles_visitante !== ""){
            const gl = Number(partido.goles_local);
            const gv = Number(partido.goles_visitante);
            if(gl === gv){
                celda.classList.add("empate");
            }else if(
                (partido.local.trim() === MI_EQUIPO && gl > gv) ||
                (partido.visitante.trim() === MI_EQUIPO && gv > gl)
            ){
                celda.classList.add("victoria");
            }else{
                celda.classList.add("derrota");
            }
        }else{
            celda.classList.add("pendiente");
        }
        let competicion;
        if(!isNaN(partido.jornada)){
            competicion = `Liga · Jornada ${partido.jornada}`;
        }else{
            competicion = partido.jornada;
        }
        celda.addEventListener("mouseenter",()=>{
        let resultadoHTML = "";
        if(partido.goles_local !== "" && partido.goles_visitante !== ""){
            resultadoHTML = `
                <div class="equipos">
                ${partido.local} : ${partido.goles_local} 
                <div class="vs">VS</div>
                ${partido.visitante} : ${partido.goles_visitante}
            </div>
            `;
        }
        else {
            resultadoHTML = `
                <div class="equipos">
                ${partido.local}
                <div class="vs">VS</div>
                ${partido.visitante}
            </div>
            `;

            
        }
        tooltip.innerHTML = `
            <div class="competicion">
                ${competicion}
            </div>
            ${resultadoHTML}
            <div class="info">
                <div> ${partido.fecha || "-"} </div>
                <div>🕒 ${partido.hora || "-"}</div>
                <div>📍 ${partido.campo || "-"}</div>
            </div>
        `;
        tooltip.classList.add("visible");
    });
    celda.addEventListener("mousemove", () => {
        const rect = celda.getBoundingClientRect();
        const margen = 12;
        let x = rect.right + margen;
        let y = rect.top;
        // Si no cabe a la derecha, lo ponemos a la izquierda
        if (x + tooltip.offsetWidth > window.innerWidth - 10) {
            x = rect.left - tooltip.offsetWidth - margen;
        }
        // Si tampoco cabe, lo centramos en la pantalla
        if (x < 10) {
            x = (window.innerWidth - tooltip.offsetWidth) / 2;
        }
        // Ajuste vertical
        if (y + tooltip.offsetHeight > window.innerHeight - 10) {
            y = window.innerHeight - tooltip.offsetHeight - 10;
        }
        if (y < 10) {
            y = 10;
        }
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    });

    celda.addEventListener("mouseleave",()=>{
        tooltip.classList.remove("visible")
    });

    celda.addEventListener("click",()=>{
        location.href = `partido.html?id=${partido.id}`;
    });
    }
        grid.appendChild(celda);
    }
    contenedor.appendChild(grid);
}
