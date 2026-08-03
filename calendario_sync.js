// =======================================
// SINCRONIZACIÓN DE CALENDARIO
// =======================================

const URL_CALENDARIO =
    "https://pedrovalcarcel.github.io/laspistas.github.io/calendario.ics";

const URL_GOOGLE =
    "https://calendar.google.com/calendar/u/0/r/settings/addbyurl";

const URL_OUTLOOK =
    "https://outlook.live.com/calendar/0/addcalendar";


// =======================================
// GOOGLE
// =======================================

document.getElementById("btn-google")
.addEventListener("click", () => {

    navigator.clipboard.writeText(URL_CALENDARIO);

    const abrir = confirm(
`Se ha copiado automáticamente la dirección del calendario.

Ahora se abrirá Google Calendar.

En Google pulsa:

Añadir calendario
→ Desde URL

y pega la dirección.

¿Abrir Google Calendar?`
    );

    if (abrir) {

        window.open(
            URL_GOOGLE,
            "_blank"
        );

    }

});


// =======================================
// APPLE
// =======================================

document.getElementById("btn-apple")
.addEventListener("click", () => {

    window.location.href = URL_CALENDARIO;

});


// =======================================
// OUTLOOK
// =======================================

document.getElementById("btn-outlook")
.addEventListener("click", () => {

    navigator.clipboard.writeText(URL_CALENDARIO);

    const abrir = confirm(
`Se ha copiado automáticamente la dirección del calendario.

Ahora se abrirá Outlook.

Pulsa:

Agregar calendario
→ Suscribirse desde la Web

y pega la dirección.

¿Abrir Outlook?`
    );

    if (abrir) {

        window.open(
            URL_OUTLOOK,
            "_blank"
        );

    }

});