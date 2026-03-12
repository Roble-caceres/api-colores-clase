//Crea un servidor que recibe peticiones del navegador y decide si leer, crear, borrar y actualizar colores usando la base de datos.

import dotenv from 'dotenv';//“Voy a usar dotenv para cargar las variables de entorno desde un archivo .env, como el puerto en el que corre el servidor.”
dotenv.config();//“Carga las variables de entorno desde el archivo .env y las hace disponibles en process.env.”
//-----------
import express from 'express';//“Voy a usar Express para crear un servidor”.
import cors from 'cors';//“Voy a usar CORS para permitir que el frontend (que corre en otro puerto) pueda comunicarse con este servidor sin problemas de seguridad.” 
import bcrypt from "bcrypt";//“Voy a usar bcrypt para encriptar las contraseñas de los usuarios antes de guardarlas en la base de datos, y para comparar las contraseñas cuando los usuarios intenten iniciar sesión.”  
import jwt from "jsonwebtoken";//“Voy a usar jsonwebtoken para crear tokens de autenticación que el frontend pueda usar para acceder a rutas protegidas en el backend.”
import {leerColores,crearColor,borrarColor,actualizarColor,buscarUsuario} from "./db.js";//“Voy a usar estas cuatro funciones que están en el archivo db.js para interactuar con la base de datos”.

async function verificar(peticion,respuesta,siguiente) {
    if(!peticion.headers.authorization){
        return respuesta.sendStatus(403);
    }

    let [,token] = peticion.headers.authorization.split(" ");//el token viene en el header de la petición, con el formato "Bearer token

    try{

        let datos = await jwt.verify(token,process.env.SECRET);

        peticion.usuario = datos.id;

        siguiente();

    }catch(e){
        respuesta.sendStatus(403);
        
    }
    
}

const servidor = express();//“Crea el servidor expres"

servidor.use(cors());//“Servidor, usa CORS para permitir peticiones desde otros orígenes (como el frontend que corre en otro puerto).”  

servidor.use( express.json());//esto convierte tenxo json que viene del front en objeto js

//servidor.use( express.static("./front"));

servidor.post("/login", async (peticion,respuesta) => {
    let {usuario,password} = peticion.body;

    if(!usuario || !usuario.trim() || !password || !password.trim()){
        return respuesta.sendStatus(403);
    }
    try{
        let posibleUsuario = await buscarUsuario(usuario);

        if(!posibleUsuario){
            return respuesta.sendStatus(403);
        }
        let coincide = await bcrypt.compare(password,posibleUsuario.password);

        if(!coincide){
           return respuesta.sendStatus(401);
        }
        let token = jwt.sign({ id:posibleUsuario._id },process.env.SECRET);

        respuesta.json({token});

    } catch(e) {
        respuesta.status(500);
        respuesta.json({ error: "error en el servidor" });
    }
});
servidor.use(verificar);

//primera ruta:“Cuando alguien pida /colores, el servidor va a ejecutar este código.”
servidor.get("/colores", async (peticion,respuesta) => {

    try {//“Intenta hacer esto:”
        let colores = await leerColores(peticion.usuario);//Usa la función leerColores para obtener la lista de colores de db.js y la guarda en la variable colores,con await: “Espera aquí hasta que la base de datos responda.”La respuesta me la da el return new promise de db.js

        respuesta.json(colores);//“Luego, responde al navegador con esa lista de colores en formato JSON.”

    } catch(e) {//“Si algo sale mal, haz esto otro:”
        respuesta.status(500);//“Dile al navegador que hubo un error en el servidor (código 500).”      

        respuesta.json({ error: "error en la base de datos" });//“Y responde con un mensaje de error en formato JSON.”  
    }   
});
//segunda ruta:“Cuando alguien envíe datos a /nuevo, el servidor va a ejecutar este código.”
servidor.post("/nuevo", async (peticion,respuesta) => {//“quiero añadir un color nuevo

  try {
        let {r,g,b} = peticion.body;
        let usuario = peticion.usuario;

        let id = await crearColor({r,g,b,usuario});

        respuesta.json({id});//“Luego, responde al navegador con el id del nuevo color en formato JSON.”

    } catch(e) {
        respuesta.status(500);

        respuesta.json({ error: "error en la base de datos" });//“Y responde con un mensaje de error en formato JSON.”
    }  
});
//tercera ruta:“Cuando alguien pida /borrar/ seguido de un id, el servidor va a ejecutar este código.”
servidor.delete("/borrar/:id", async (peticion, respuesta,siguiente) => {//“quiero borrar un color por su id, el id viene como parte de la URL, por eso usamos :id para decir que es una variable.”

    try {
        let cantidad =  await borrarColor(peticion.params.id,peticion.usuario);// El id se envía desde el frontend cuando se hace: fetch(`/borrar/${this.id}`)Cuando la petición llega al backend, Express detecta ":id" y automáticamente guarda ese valor en peticion.params.id. Después ese id se envía a la función borrarColor, donde se convierte aObjectId para que MongoDB pueda reconocerlo correctamente.
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
        let {existe,cambio} =  await actualizarColor(peticion.params.id,peticion.body,peticion.usuario);

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