const params=new URLSearchParams(window.location.search);
const dorsal=params.get("dorsal");

const spreadsheet="2PACX-1vSGb45ee7oLsTv2vO5bmbkdsEOV_mMpCOi_jpINeNh7d5xAu8CMo7r8C5yFZS7amamHT7rfKiL39U6C";

const temporadas={
    "2025/26":{
        partidos:0,
        eventos:1785101781
    },
    "2026/27":{
        partidos:529616834,
        eventos:644906735
    }
};



const urlJugadores="jugadores.json";

function urlCSV(gid){
    return `https://docs.google.com/spreadsheets/d/e/${spreadsheet}/pub?gid=${gid}&single=true&output=csv`;
}

function obtenerTemporadaActual(){

    const hoy=new Date();
    const año=hoy.getFullYear();
    const mes=hoy.getMonth()+1;
    console.log("Mes actual:", mes, "Año actual:", año);

    if(mes>=9){
        return `${año}/${String(año+1).slice(-2)}`;
    }

    return `${año-1}/${String(año).slice(-2)}`;

}

fetch(urlJugadores)
.then(r=>r.json())
.then(data=>{
    const jugadores=Array.isArray(data)?data:data.jugadores;
    const jugador=jugadores.find(j=>String(j.dorsal)===String(dorsal));
    if(!jugador){
        document.body.innerHTML="<h1>Jugador no encontrado</h1>";
        return;
    }
    pintarJugador(jugador);
    crearSelectorTemporadas(jugador);
});

function crearSelectorTemporadas(jugador){
    const selector=document.getElementById("selector-temporada");
    selector.innerHTML="";
    const temporadaActual=obtenerTemporadaActual();
    Object.keys(temporadas)
        .sort()
        .reverse()
        .forEach(temp=>{
            const option=document.createElement("option");
            option.value=temp;
            option.textContent=temp;
            if(temp===temporadaActual){
                option.selected=true;
            }
            selector.appendChild(option);
        });

    const option=document.createElement("option");
    option.value="general";
    option.textContent="General";
    selector.appendChild(option);
    selector.value=temporadaActual;
    cargarEstadisticas(temporadaActual,jugador);
    selector.addEventListener("change",()=>{

        console.log("Cambio de temporada:", selector.value);

        if(selector.value==="general"){
            cargarGeneral(jugador);
        }else{
            cargarEstadisticas(selector.value,jugador);
        }

    });
}


function pintarJugador(jugador){
    document.getElementById("nombre-jugador").textContent=`${jugador.nombre} ${jugador.apellidos}`;
    document.getElementById("alias").textContent=jugador.alias;
    document.getElementById("fecha").textContent=jugador.fecha_nacimiento;
    document.getElementById("nacionalidad").innerHTML = `
        <img
            src="img/banderas/${jugador.nacionalidad}.png"
            class="bandera"
            alt="${jugador.nacionalidad}">
        ${jugador.nacionalidad}
    `;
    document.getElementById("frase").textContent=jugador.frase;
    document.getElementById("foto-jugador").src =`img/jugadores/${jugador.dorsal}.jpg`;
    const card=jugador["card-stats"];
    document.getElementById("card-rating").textContent=card.media;
    document.getElementById("card-pos").textContent=jugador.posicion;
    const paisArchivo = jugador.nacionalidad
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
    document.getElementById("card-flag").innerHTML = `
        <img
            src="img/banderas/${paisArchivo}.png"
            class="bandera-jugador"
            alt="${jugador.nacionalidad}">
    `;
    document.getElementById("nacionalidad").textContent =
        jugador.nacionalidad;
    document.getElementById("ritmo").textContent=card.ritmo;
    document.getElementById("tiro").textContent=card.tiro;
    document.getElementById("pase").textContent=card.pase;
    document.getElementById("regate").textContent=card.regate;
    document.getElementById("defensa").textContent=card.defensa;
    document.getElementById("fisico").textContent=card.fisico;
    document.querySelectorAll(".circulo").forEach(c=>{
        const pos=c.dataset.pos;
        c.classList.remove("buena","regular","mala");
        if(jugador.posiciones[pos]){
            c.classList.add(jugador.posiciones[pos]);
        }
    });
}

async function cargarEstadisticas(temporada,jugador){
    console.log("Entrando en cargarEstadisticas:", temporada);
    const datos=temporadas[temporada];
    if(!datos){
        return;
    }
    console.log(datos);
    console.log(urlCSV(datos.partidos));
    console.log(urlCSV(datos.eventos));

    const csvPartidos=await fetch(urlCSV(datos.partidos)).then(r=>r.text());
    const csvEventos=await fetch(urlCSV(datos.eventos)).then(r=>r.text());
    const partidos=csvToJSON(csvPartidos);
    const eventos=csvToJSON(csvEventos);


    let partidosJugados=0;
    let goles=0;
    let asistencias=0;
    let tarjetas=0;

    partidos.forEach(partido=>{
        if(partido.jornada==="Amistoso"){
            return;
        }
        const convocados=partido.convocados
            ?partido.convocados.split("-").map(x=>x.trim())
            :[];
        if(convocados.includes(String(dorsal))){
            partidosJugados++;
        }
    });

    eventos.forEach(evento=>{
        if(String(evento.dorsal_goleador)===String(dorsal)){
            goles++;
        }
        if(String(evento.dorsal_asistente)===String(dorsal)){
            asistencias++;
        }
        if(
            String(evento.dorsal_tarjeta_amarilla)===String(dorsal)||
            String(evento.dorsal_tarjeta_roja)===String(dorsal)
        ){
            tarjetas++;
        }
    });

    const gya=partidosJugados>0
        ?((goles+asistencias)/partidosJugados).toFixed(2)
        :"0.00";
    pintarEstadisticas(
        partidosJugados,
        goles,
        asistencias,
        gya,
        tarjetas,
        temporada
    );

}

function pintarEstadisticas(partidos,goles,asistencias,gya,tarjetas,temporada){

    document.getElementById("estadisticas").innerHTML=`

    <div class="estadistica">
        <strong>Partidos</strong>
        <span class="valor-estadistica">${partidos}</span>
    </div>

    <div class="estadistica">
        <strong>Goles</strong>
        <span class="valor-estadistica">${goles}</span>
    </div>

    <div class="estadistica">
        <strong>Asistencias</strong>
        <span class="valor-estadistica">${asistencias}</span>
    </div>

    <div class="estadistica">
        <strong>G+A / Partido</strong>
        <span class="valor-estadistica">${gya}</span>
    </div>

    <div class="estadistica">
        <strong>Tarjetas</strong>
        <span class="valor-estadistica">${tarjetas}</span>
    </div>

    `;

}

async function cargarGeneral(){
    let partidosJugados=0;
    let goles=0;
    let asistencias=0;
    let tarjetas=0;
    console.log(temporadas);
    for(const temporada of Object.keys(temporadas)){
        const datos=temporadas[temporada];
        const csvPartidos=await fetch(urlCSV(datos.partidos)).then(r=>r.text());
        const csvEventos=await fetch(urlCSV(datos.eventos)).then(r=>r.text());
        const partidos=csvToJSON(csvPartidos);
        const eventos=csvToJSON(csvEventos);

        partidos.forEach(partido=>{
            if(partido.jornada==="Amistoso"){
                return;
            }
            const convocados=partido.convocados
                ?partido.convocados.split("-").map(x=>x.trim())
                :[];
            if(convocados.includes(String(dorsal))){
                partidosJugados++;
            }
        });


        eventos.forEach(evento=>{
            if(String(evento.dorsal_goleador)===String(dorsal)){
                goles++;
            }
            if(String(evento.dorsal_asistente)===String(dorsal)){
                asistencias++;
            }
            if(
                String(evento.dorsal_tarjeta_amarilla)===String(dorsal) ||
                String(evento.dorsal_tarjeta_roja)===String(dorsal)
            ){
                tarjetas++;
            }
        });

    }


    const gya=partidosJugados>0
        ?((goles+asistencias)/partidosJugados).toFixed(2)
        :"0.00";

    pintarEstadisticas(
        partidosJugados,
        goles,
        asistencias,
        gya,
        tarjetas,
        "General"
    );

}

function csvToJSON(csv){
    const lines=csv.split("\n");
    const headers=lines[0].split(",").map(h=>h.trim().toLowerCase());
    return lines.slice(1)
        .filter(l=>l.trim()!=="")
        .map(line=>{
            const values=line.split(",");
            const obj={};
            headers.forEach((h,i)=>{
                obj[h]=values[i]?values[i].trim():"";
            });
            return obj;
        });
}

