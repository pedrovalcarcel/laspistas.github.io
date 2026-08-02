const foto = document.getElementById("foto-equipo");
const visor = document.getElementById("visor-foto");

foto.addEventListener("click", () => {
    visor.classList.add("abierto");
});

visor.addEventListener("click", () => {
    visor.classList.remove("abierto");
});

document.addEventListener("keydown", e => {
    if(e.key === "Escape"){
        visor.classList.remove("abierto");
    }
});