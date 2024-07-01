let numeroTematicaActual = 1;

async function parseFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        console.error('No se ha seleccionado ningún archivo');
        return;
    }

    const fileContent = await readFileContent(file);
    const sesiones = parseFileContent(fileContent);
    const sesionesOrganizadas = organizeSessions(sesiones);
    renderConferencias(sesionesOrganizadas);
}

// Función para leer el contenido del archivo seleccionado
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            resolve(event.target.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
}

// Función para analizar el contenido del archivo y parsearlo
function parseFileContent(fileContent) {
    let lines = fileContent.split(/(\d+min)/);
    console.log(lines);
    lines = lines.filter((line) => line.trim() !== "");
    let count = 0;
    const sesiones = [];
    let titulo="";

    lines.forEach((l) => {
        count++;
        let duracion;
        if(!(count%2 === 0)) {
            titulo = l.trim().replace(/\r\n/,"");
        } else {
            duracion = l.trim();
            sesion = {
                titulo: titulo,
                duracion: duracion
            }
            sesiones.push(sesion);
        }
    });
    return sesiones;
}

// Función para organizar las sesiones en tópicos y asignar horarios
function organizeSessions(sesiones) {
    const tematicas = [];

    // sesiones donde se van a actualizar cada charla en su sesion correspondiente, se agregan al final del dia despues de agregar el social event
    let sesionAM = [];
    let sesionPM = [];

    let tiempoActual = 540; // 9:00 AM en minutos

    let socialEventFinalizado = false;

    sesiones.forEach((sesion, idx) => {

        let tematicaActual = 'Tópico '+numeroTematicaActual;

        const titulo = sesion.titulo;
        const duracion = sesion.duracion.split('min')[0];        

        const sesionSgte = sesiones[idx+1];
        const duracionSesionSgte = sesionSgte ? sesionSgte.duracion.split('min')[0] : 0;

        // Si son justo las 12 agrego el lunch y me paso a las 13
        if( +tiempoActual===720 ){
            addLunch(+tiempoActual, sesionAM);
            tiempoActual = 780;
        }

        // Si tiempo actual entre 11 y 13, y minutos de hora actual + duracion de charla actual exceden 60 min
        if( (+tiempoActual>=660) && (+tiempoActual<780) && ((+duracion + +extraMins(+tiempoActual))>60) ){
            if(+tiempoActual!=720){ // Si tiempo actual no es 12
                // Mete otra charla en el hueco
                preEventOrganize(sesiones, idx, +tiempoActual, sesionAM); // Se le manda sesionAM para organizar charlas en la mañana
                tiempoActual += +duracion; // Se incrementa el tiempo con lo que dure
            }
            addLunch(+tiempoActual, sesionAM);
            tiempoActual = 780;
        }

        // Si son mas de las 16
        if(+tiempoActual>=960){
            if(+tiempoActual===1020){ // Si son justo las 17
                addSocialEvent(+tiempoActual, sesionPM);
                socialEventFinalizado = true;
                tiempoActual = 540;
            }
            if((+duracion + +extraMins(tiempoActual))>60){ // Si la duracion de la charla actual + minutos de la hora actual exceden 60 min
                addSocialEvent(+tiempoActual, sesionPM);
                socialEventFinalizado = true;
                tiempoActual = 540;
            }
        }

        
        // SI SE ACABA SOCIAL EVENT SIGNIFICA QUE YA ACABO UNA TEMATICA POR LO QUE SE AGREGA UNA ITERACION A TEMATICAS Y SE PASA AL DIA SIGUIENTE
        if(socialEventFinalizado){
            
            tematicas.push({
                tematicaNombre: tematicaActual,
                AM: sesionAM,
                PM: sesionPM
            })

            tiempoActual = 540;
            sesionAM = [];
            sesionPM = [];            
            numeroTematicaActual++;     
            socialEventFinalizado = false;       
        } 

        // FALTA AGREGAR EL CASO GENERICO Y DECIDIR QUE PASARA SI TERMINA EL TOPICO
        if( (+tiempoActual>=540) && (+tiempoActual<720) ){
            // AGREGA CHARLA EN SESION DE LA MAÑANA
            sesionAM.push({ titulo: titulo, duracion: +duracion+" minutos", horaInicio: minutesToTime(tiempoActual) });
            tiempoActual += +duracion; // al tiempoActual se le agrega la duracion de la charla para continuar con la siguiente iteracion
        }

        if( (+tiempoActual>=780) && (+tiempoActual<1020) ){
            // AGREGA CHARLA EN SESION DE LA TARDE
            sesionPM.push({ titulo: titulo, duracion: +duracion+" minutos", horaInicio: minutesToTime(tiempoActual) });
            tiempoActual += +duracion; // al tiempoActual se le agrega la duracion de la charla para continuar con la siguiente iteracion
        }
   
        // ULTIMA CHARLA DEL ULTIMO TOPIC
        if(+duracionSesionSgte===0){
            if(+tiempoActual>=960){
                addSocialEvent(+tiempoActual, sesionPM);
                tiempoActual = 540;
                socialEventFinalizado = true;
            }            

            tematicas.push({
                tematicaNombre: tematicaActual,
                AM: sesionAM,
                PM: sesionPM
            })

            tiempoActual = 540;
            sesionAM = [];
            sesionPM = [];            
            numeroTematicaActual++;     
            socialEventFinalizado = false;   
        }
    });

    return tematicas;
}

// Función para reorganizar charlas antes de Lunch si existe un hueco en el que quepan
function preEventOrganize(sesionesParam, idxParam, tiempoActualParam, sesionParam) {   
    salirCiclo = false; 
    sesionesParam.forEach((sesion, idx) => {  
        if (salirCiclo){
            return;
        }
        
        // Ignora indices previos ya que solo me interesan los que aun faltan por planificar y se pueden reorganizar
        if(idx>idxParam){
            const titulo = sesion.titulo;
            const duracion = +sesion.duracion.split("min")[0];

            if(+duracion + (+extraMins(tiempoActualParam)) === 60 ){
                sesionParam.push({ titulo: titulo, duracion: +duracion+" minutos", horaInicio: minutesToTime(tiempoActualParam) });
                // tiempoActualParam += +duracion; // Se incrementa el tiempo con lo que dure
                sesionesParam.splice(idx, 1); // Es necesario eliminar la charla una vez se reorganiza para que no se vuelva a agregar
                salirCiclo = true;
                // return ; // Deberia salir del forEach
            }
        }

        
    }

    )
}

// Agrega evento de LUNCH
function addLunch(tiempoActual, sesionAM) {
    sesionAM.push({ titulo: 'LUNCH', duracion: '60 minutos', horaInicio: '12:00 PM' });
    console.log(sesionAM)
}

// Agrega evento de SOCIAL EVENT
function addSocialEvent(tiempoActual, sesionPM) {
    sesionPM.push({ titulo: 'SOCIAL EVENT', duracion: '', horaInicio: minutesToTime(tiempoActual) });
    console.log(sesionPM)
}

// Función para obtener los minutos sobrantes de horas no en punto
function extraMins(minutes) {
    const mins = minutes % 60;
    return mins;
}

// Función para convertir minutos a formato de hora
function minutesToTime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${hrs >= 12 ? 'PM' : 'AM'}`;
}

// Función para renderizar los resultados en la tabla
function renderConferencias(tematicas) {
    const conferenciasTabla = document.getElementById('conferenciasTabla');
    conferenciasTabla.innerHTML = '';
    
    Object.keys(tematicas).forEach(tematica => {
        console.log(tematica);
        const tituloTematica = document.createElement('h2');
        tituloTematica.textContent = "Tematica "+(+tematica+1);
        conferenciasTabla.appendChild(tituloTematica);

        ['AM', 'PM'].forEach(tipoSesion => {
            const sesion = tematicas[tematica][tipoSesion];
            const tituloSesion = document.createElement('h3');
            tituloSesion.textContent = tipoSesion === 'AM' ? 'Sesión de la Mañana' : 'Sesión de la Tarde';
            conferenciasTabla.appendChild(tituloSesion);

            const table = document.createElement('table');
            table.border = '1';
            table.innerHTML = `
                <tr>
                    <th>Hora</th>
                    <th>Título</th>
                    <th>Duración</th>
                </tr>
            `;

            sesion.forEach(charla => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${charla.horaInicio}</td>
                    <td>${charla.titulo}</td>
                    <td>${charla.duracion}</td>
                `;
                table.appendChild(row);
            });

            conferenciasTabla.appendChild(table);
        });
    });
}
