fetch("resultados.json")
.then(res => res.json())
.then(data => { 
    const rachaDiv = document.getElementById("racha");
    const mi_equipo = "Las Pistas FC";
    const partidosOrdenados = [...data.partidos].sort((a,b) => {
        const fa = new Date(a.fecha.split("/").reverse().join("-"));
        const fb = new Date(b.fecha.split("/").reverse().join("-"));
        return fa-fb;
    });
    const ultimos5 = partidosOrdenados.slice(-5);
    let cont = 0;
    const total = ultimos5.length;
    ultimos5.forEach(p => {
        let resultado;
        if(p.goles_local != "?"){
            if (p.local === mi_equipo){
                if (p.goles_local > p.goles_visitante) resultado = "v";
                else if (p.goles_local < p.goles_visitante) resultado = "d";
                else resultado = "e";
            } else if (p.visitante === mi_equipo){
                if (p.goles_local > p.goles_visitante) resultado = "d";
                else if (p.goles_local < p.goles_visitante) resultado = "v";
                else resultado = "e";
            }
            else {
                return;
            }
            cont++;
            const enlace = document.createElement("a");
            enlace.href = `partido.html?id=${p.id}`;
            enlace.title = `J${p.jornada}: ${p.local} ${p.goles_local} - ${p.goles_visitante} ${p.visitante}`;

            const cuadrado = document.createElement("div");
            cuadrado.classList.add("cuadrado-resultado", resultado);

            if (cont === total){
                cuadrado.classList.add("ultimo");
            }

            enlace.appendChild(cuadrado);
            rachaDiv.appendChild(enlace);
        }
        
    });
});