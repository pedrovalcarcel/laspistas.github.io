// ============================================================
// TOOLTIP PARA LOS PARTIDOS DE LA RACHA
// ============================================================
// Mismo estilo visual que el tooltip del calendario (reutiliza la
// clase CSS .tooltip-calendario), pero con nombres propios
// (tooltipRacha / crearTooltipRacha) para no chocar si esta misma
// página también carga calendario.js (como pasa en index.html).
//
// Uso: después de insertar el HTML de una racha en el DOM, llama a
//   activarTooltipsRacha(contenedor, todosLosPartidos)
// donde "contenedor" es el elemento que envuelve los cuadraditos
// V/E/D, y "todosLosPartidos" el array donde están esos partidos
// (para poder buscar cada uno por su id y sacar rival/fecha/hora).

let tooltipRacha;

function crearTooltipRacha() {

    const existente = document.querySelector(".tooltip-racha");

    if (existente) {
        tooltipRacha = existente;
        return tooltipRacha;
    }

    tooltipRacha = document.createElement("div");
    tooltipRacha.className = "tooltip-calendario tooltip-racha";
    document.body.appendChild(tooltipRacha);

    return tooltipRacha;

}

function activarTooltipsRacha(contenedor, todosLosPartidos) {

    if (!contenedor || !Array.isArray(todosLosPartidos)) {
        return;
    }

    if (!tooltipRacha) {
        crearTooltipRacha();
    }

    contenedor.querySelectorAll(".partido-racha[data-id]").forEach(elemento => {

        const partido = todosLosPartidos.find(
            p => String(p.id) === String(elemento.dataset.id)
        );

        if (!partido) {
            return;
        }

        let competicion;

        if (!isNaN(partido.jornada)) {
            competicion = `Liga · Jornada ${partido.jornada}`;
        } else {
            competicion = partido.jornada || "Amistoso";
        }

        elemento.addEventListener("mouseenter", () => {

            tooltipRacha.innerHTML = `
                <div class="competicion">${competicion}</div>
                <div class="equipos">
                    ${partido.local} : ${partido.goles_local}
                    <div class="vs">VS</div>
                    ${partido.visitante} : ${partido.goles_visitante}
                </div>
                <div class="info">
                    <div>${partido.fecha || "-"}</div>
                    <div>🕒 ${partido.hora || "-"}</div>
                    <div>📍 ${partido.campo || "-"}</div>
                </div>
            `;

            tooltipRacha.classList.add("visible");

        });

        elemento.addEventListener("mousemove", (evento) => {

            const margen = 16;
            let x = evento.clientX + margen;
            let y = evento.clientY + margen;

            if (x + tooltipRacha.offsetWidth > window.innerWidth - 10) {
                x = evento.clientX - tooltipRacha.offsetWidth - margen;
            }

            if (y + tooltipRacha.offsetHeight > window.innerHeight - 10) {
                y = window.innerHeight - tooltipRacha.offsetHeight - 10;
            }

            if (x < 10) x = 10;
            if (y < 10) y = 10;

            tooltipRacha.style.left = `${x}px`;
            tooltipRacha.style.top = `${y}px`;

        });

        elemento.addEventListener("mouseleave", () => {
            tooltipRacha.classList.remove("visible");
        });

    });

}