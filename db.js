//db.js es el archivo que se encarga de conectarse a MongoDB y hacer operaciones en la base de datos (leer, crear, borrar y actualizar colores).
//Una función para leer colores
//Una función para crear un color
//Una función para borrar un color
// Una función para actualizar un color

import dotenv from 'dotenv';//“Voy a usar dotenv para cargar las variables de entorno desde un archivo .env, como el puerto en el que corre el servidor.”
dotenv.config();//“Carga las variables de entorno desde el archivo .env y las hace disponibles en process.env.”
//-----------

import {MongoClient,ObjectId } from 'mongodb';// Importamos MongoClient para poder conectarnos a MongoDB
// e ObjectId para convertir los id (string) a tipo ObjectId que Mongo utiliza

const urlMongo = process.env.MONGO_URL;//“La URL de conexión a MongoDB la guardo en una variable de entorno llamada MONGO_URL, que se carga desde el archivo .env con dotenv.”

function conectar() {//aqui solo defino la funcion,no ejecuto nada
     return MongoClient.connect(urlMongo);// Función que intenta conectar con la base de datos MongoDB usando la URL. Devuelve una promesa que, cuando se resuelve, contiene la conexión.
}
//leerColores obtiene todos los colores guardados en la base de datos y los devuelve al backend.
export function leerColores() {//leercolores esta conectada con index.js
    return new Promise( (ok, ko) => {//lo que reciba de esta promesa lo devuelve a await leerColores de index.js
        let conexion = null;// La declaramos fuera del .then() y en null para poder usarla luego en .finally() y cerrarla
         conectar()//ejecutamos conectar,la promesa se crea en Mongo.client.connect()
        .then( ObjConexion => {//.then() espera a que la conexión termine.
            conexion = ObjConexion;//“Guardo la conexión en la variable que declaré antes.”
                             //objConexion es el resultado que devuelve
            let coleccion = conexion.db("colores").collection("colores");//Entra en la base de datos "colores" y luego en la colección "colores".

            return coleccion.find({}).toArray();//Busca todos los documentos de la colección y los devuelve en forma de array,ls llaves vacias significa no pongas ningun filtro devuelve todos los documentos y eso devuelve una promesa que cuando termine contiene el array de colores
        })
        .then( colores => {
            ok(colores);//el await de index.js recibe el ok que llega aqui
        })
        .catch(() => ko({ error: "error en la base de datos" }))
        .finally(() => {
            if (conexion) {
                conexion.close();
            }
        });
    });
}
export function crearColor(objColor) {//{r,g,b}
    return new Promise( (ok, ko) => {
        let conexion = null;
        conectar()
        .then( ObjConexion => {
            conexion = ObjConexion;

            let coleccion = conexion.db("colores").collection("colores");

            return coleccion.insertOne(objColor);//esto le dice a mongo,guarda este objeto en la colleccion
        })
        .then(({ insertedId }) => {
         ok(insertedId);
        })
        .catch(() => ko({ error: "error en la base de datos" }))
        .finally(() => {
            if (conexion) {
                conexion.close();
            }
        });
    });
}
export function borrarColor(id) {
    return new Promise((ok, ko) => {
        let conexion = null;
        conectar()
        .then( ObjConexion => {
            conexion = ObjConexion;

            let coleccion = conexion.db("colores").collection("colores");

            return coleccion.deleteOne({_id : new ObjectId(id)});
        })
        .then(({ deletedCount}) => {
         ok(deletedCount);
        })
        .catch(() => ko({ error: "error en la base de datos" }))
        .finally(() => {
            if (conexion) {
                conexion.close();
            }
        });
    });
     
}
export function actualizarColor(id,objCambios) {//{r,g,b}
    return new Promise((ok, ko) => {
        let conexion = null;
        conectar()
        .then( ObjConexion => {
            conexion = ObjConexion;

            let coleccion = conexion.db("colores").collection("colores");

            return coleccion.updateOne({_id : new ObjectId(id)},{$set : objCambios});
        })
        .then(({modifiedCount,matchedCount}) => {
         ok({
            existe : matchedCount,
            cambio : modifiedCount
         });
        })
        .catch(() => ko({ error: "error en la base de datos" }))
        .finally(() => {
            if (conexion) {
                conexion.close();
            }
        });
    });
     
}



