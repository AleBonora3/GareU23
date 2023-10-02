const mongoose = require('mongoose');
const percorsoSchema = new mongoose.Schema({
  nome: String,  //presente nel gpx
  distanza: Number, 
//viene calcolata con una funzione che prende tutti i punti vicini del gpx, ne calcola la distanza e poi somma tutto
  dislivello: Number, //stesso discorso che viene fatto per la distanza
  gpxfile: String,
  descrizione: String, //da inserire
  difficolta: String, //calcolata con uno switch e in base al dislivello calcola una difficolta
  categoria: String, //da inserire
  tipo: {
    type: String,
    enum: ['Regionale', 'Nazionale', 'Internazionale'],
    default: 'Regionale',
  },
  commenti:[{autore:String, testo:String}],
//questi vengono inseriti dagli utenti quando utilizzano il sito
});

module.exports = mongoose.model('Percorso', percorsoSchema)
