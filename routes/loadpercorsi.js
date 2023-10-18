const express = require('express');
const router = express.Router();
const fs = require('fs');
var path = require('path');

const gpxParse = require('gpx-parse');

//per calcolare le distanze dati latitudine e longitudine
const geolib = require('geolib');

const percorso = require('../models/percorso');

router.get('/all', async function(req, res, next) {
  const directoryPath = 'public/gpx'; 
  let garaDict = {};

  // Leggi il contenuto della directory
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Errore durante la lettura della directory:', err);
      return;
    }

    // Cicla sulla lista dei file
    files.forEach((file) => {
      console.log('Nome del file:', file);
      const nomeFile = path.basename(file);

      let garaDict = getGaraData('public/gpx/'+nomeFile);
      let newgara = new percorso(garaDict);
      newgara.save();
    });
    res.redirect('/');
  });
});

function getGaraData(gpxTrack) {
  // Leggi il file GPX e ottieni i dati altimetrici ed i punti della traccia
  const gpxData = fs.readFileSync(gpxTrack, 'utf8');
  let trackName = '';
  let trackLength = 0;
  let trackElevation = 0;
  let retData = {};
  
  gpxParse.parseGpx(gpxData, function (error, data) {
    if (!error) {
      const trackPoints = data.tracks[0].segments[0];
      let totalDistance = 0;
      let totalElevation = 0;
      trackName = data.tracks[0].name
  
      for (let i = 1; i < trackPoints.length; i++) {
        const startPoint = trackPoints[i - 1];
        const endPoint = trackPoints[i];
        const distance = geolib.getDistance(
          { latitude: startPoint.lat, longitude: startPoint.lon },
          { latitude: endPoint.lat, longitude: endPoint.lon }
        );
  
        totalDistance += distance/1000;
  
        if (Number(endPoint.elevation[0]) > Number(startPoint.elevation[0])) {
          totalElevation += Number(endPoint.elevation[0]) - Number(startPoint.elevation[0]);
        }
      }

      trackLength = totalDistance;
      trackElevation = totalElevation;
      let difficolta = "Bassa";
      switch (true) {
        case trackElevation >= 800 && trackElevation <1000:
          difficolta = "Medio-Bassa"
          break;
        case trackElevation >= 1000 && trackElevation <1400:
          difficolta = "Media"
          break;
        case trackElevation >= 1400 && trackElevation <1800:
          difficolta = "Medio-Alta"
          break;
        case trackElevation >= 1800 && trackElevation <2000:
          difficolta = "Alta"
          break;
        case trackElevation >= 2000:
          difficolta = "Molto-Alta"
          break;        
        default:
          difficolta = "Bassa";
      }
    
      retData = {
          nome: trackName,
          gpxfile: gpxTrack,
          distanza: trackLength,
          dislivello: trackElevation,
          difficolta: difficolta,
          descrizione: "",
          tipo: "Regionale",
          categoria: "U23 Elite",
          commenti:[],
        };
    } else {
      console.error('Errore nella lettura del file GPX:', error);
    }
  });
  return retData;
}

module.exports = router;