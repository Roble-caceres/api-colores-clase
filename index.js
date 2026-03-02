//Crea un servidor que recibe peticiones del navegador y decide si leer, crear, borrar y actualizar colores usando la base de datos.

import dotenv from 'dotenv';//“Voy a usar dotenv para cargar las variables de entorno desde un archivo .env, como el puerto en el que corre el servidor.”
dotenv.config();//“Carga las variables de entorno desde el archivo .env y las hace disponibles en process.env.”
//-----------
import express from 'express';//“Voy a usar Express para crear un servidor”.
import cors from 'cors';//“Voy a usar CORS para permitir que el frontend (que corre en otro puerto) pueda comunicarse con este servidor sin problemas de seguridad.”    
import {leerColores,crearColor,borrarColor,actualizarColor} from "./db.js";//“Voy a usar estas cuatro funciones que están en el archivo db.js para interactuar con la base de datos”.

const servidor = express();//“Crea el servidor expres"

servidor.use(cors());//“Servidor, usa CORS para permitir peticiones desde otros orígenes (como el frontend que corre en otro puerto).”  

servidor.use( express.json());//esto convierte tenxo json que viene del front en objeto js

//servidor.use( express.static("./front"));// “Servidor, también sirve los archivos que estén en la carpeta 'front' cuando alguien los pida.”, con express.static ya puedes meterte en localhost:3000 y puedes ver el html

//primera ruta:“Cuando alguien pida /colores, el servidor va a ejecutar este código.”
servidor.get("/colores", async (peticion,respuesta) => {

    try {//“Intenta hacer esto:”
        let colores = await leerColores();//Usa la función leerColores para obtener la lista de colores de db.js y la guarda en la variable colores,con await: “Espera aquí hasta que la base de datos responda.”La respuesta me la da el return new promise de db.js

        respuesta.json(colores);//“Luego, responde al navegador con esa lista de colores en formato JSON.”

    } catch(e) {//“Si algo sale mal, haz esto otro:”
        respuesta.status(500);//“Dile al navegador que hubo un error en el servidor (código 500).”      

        respuesta.json({ error: "error en la base de datos" });//“Y responde con un mensaje de error en formato JSON.”  
    }   
});
//segunda ruta:“Cuando alguien envíe datos a /nuevo, el servidor va a ejecutar este código.”
servidor.post("/nuevo", async (peticion,respuesta) => {//“quiero añadir un color nuevo

  try {
        let id = await crearColor(peticion.body);//“Usa la función crearColor para guardar el nuevo color que viene en el cuerpo de la petición (peticion.body) y espera a que termine, guardando el id del nuevo color en la variable id. Peticion.body contiene los datos que manda el fronted,express.json() se encarga de convertir esos datos a un objeto de JavaScript que se puede usar en el código.”

        //El frontend manda el color en el body → el backend lo recibe en peticion.body → lo guarda en Mongo → devuelve el id con respuesta.json.

        respuesta.json({id});//“Luego, responde al navegador con el id del nuevo color en formato JSON.”

    } catch(e) {
        respuesta.status(500);//“Dile al navegador que hubo un error en el servidor (código 500).”

        respuesta.json({ error: "error en la base de datos" });//“Y responde con un mensaje de error en formato JSON.”
    }  
});
//tercera ruta:“Cuando alguien pida /borrar/ seguido de un id, el servidor va a ejecutar este código.”
servidor.delete("/borrar/:id", async (peticion, respuesta,siguiente) => {//“quiero borrar un color por su id, el id viene como parte de la URL, por eso usamos :id para decir que es una variable.”

    try {
        let cantidad =  await borrarColor(peticion.params.id);// El id se envía desde el frontend cuando se hace: fetch(`/borrar/${this.id}`)Cuando la petición llega al backend, Express detecta ":id" y automáticamente guarda ese valor en peticion.params.id. Después ese id se envía a la función borrarColor, donde se convierte aObjectId para que MongoDB pueda reconocerlo correctamente.
 //La variable cantidad NO guarda el id, sino la respuesta de Mongo,
// indicando cuántos documentos se borraron (1 si se borró, 0 si no existía).
        
        if(cantidad){//si cantidad es verdadero
            return respuesta.sendStatus(204);                //En JavaScript:
                                                             //1 → es verdadero (truthy)
                                                             //0 → es falso (falsy)

                                                             //Entonces:
                                                             //Si borró algo → entra en el if
                                                             //Si no borró nada → NO entra                                        
        }
        siguiente()//Express ejecuta el middleware 404(error) si responde 0, recurso no encontrado
    
    } catch (e) {//captura errores técnicos del servidor y evita que la aplicación se rompa.

        respuesta.status(500);//error interno del servidor(no envia la respuesta,prepara el codigo)

        respuesta.json({ error: "error en el servidor" });//Devuelvo un error 500 y envío un mensaje en formato JSON explicando el error.
    }
});//cuarta ruta:esto hace que cuando alguien haga una petición PATCH a /actualizar/:id, el servidor ejecute este código para actualizar un color existente en la base de datos usando su id.
servidor.patch("/actualizar/:id", async (peticion, respuesta,siguiente) => {

    try {
        let {existe,cambio} =  await actualizarColor(peticion.params.id,peticion.body);

        if(cambio){
            return respuesta.sendStatus(204);
        }

        if(existe){
            return respuesta.json({info : "no se actualizo el recurso"})
        }

        siguiente();//404
                                                              //existe	 cambio 	Resultado
 	                                                         //   1	        1          204 (se actualizó)
                                                            //    1	       0    "no se actualizó el recurso"
                                                            //   0         0          404
    
    } catch (e) {

        respuesta.status(500);//error interno del servidor

        respuesta.json({ error: "error en el servidor" });
    }
});

//esto s ejecutaria si hay un error
servidor.use((error, peticion, respuesta,siguiente) => {//
    respuesta.status(400)// "bad request",peticion mal hecha,el cliente mando algo mal
    respuesta.json({ error: "error en la petición" });//si se llama a siguiente() con un argumento, se asume que es un error y se salta a este manejador de errores 

});//esto se ejecutaria si no existe una ruta
servidor.use((peticion, respuesta) => {
    respuesta.status(404);//no exixte id
    respuesta.json({ error: "recurso no encontrado" });

});

servidor.listen(process.env.PORT); //Inicia el servidor y lo pone a escuchar peticiones en el puerto 3000. Sin esto, la API no funciona.