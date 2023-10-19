const express = require('express');
const router = express.Router();
const fs = require('fs');

const fetch = require('node-fetch').default;//per supportare la fetch con la versione del servizio di host

const gpxParse = require('gpx-parse');
//per calcolare le distanze dati latitudine e longitudine
const geolib = require('geolib');

const percorso = require('../models/percorso');
const utente = require('../models/utenti'); //per caricare il nome utente nei commenti


//Per proteggere le rotte riservate si crea una funzione middleware che verifica 
//la session e dell'utente prima di consentire l'accesso alle pagine



function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login'); // Reindirizza alla pagina di login se l'utente non è autenticato
  }
}

router.get('/', requireLogin, async function (req, res, next) {
  try {
    // Cerca i percorsi nel database
    const percorsi = await percorso.find({}, 'nome distanza dislivello tipo');

    res.render('percorsi', { title: 'Percorsi', percorsi: percorsi, username: req.session.user })
  } catch (error) {
    console.error(error);
    res.render('error', { title: 'Error' })
  }
});


// Gestisci la richiesta GET per la pagina del percorso
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const percorsoId = req.params.id;

    // Esegui una query al database per ottenere le informazioni del percorso
    const percorsospec = await percorso.findById(percorsoId);

    if (!percorsospec) {
      return res.status(404).send('Percorso non trovato');
    }

    // Leggi il file GPX e ottieni i dati altimetrici ed i punti della traccia
    const gpxData = fs.readFileSync(percorsospec.gpxfile, 'utf8');

    let chartDataValues = { distance: [], elevation: [] };
    let mapDataValues = [];


    // Parsifica il file GPX
    gpxParse.parseGpx(gpxData, function (error, data) {
      if (error) {
        console.error('Errore nella lettura del file:', error);
        return res.status(500).send('Errore nella lettura del file GPX');
      } else {
        const trackPoints = data.tracks[0].segments[0];
        let totalDistance = 0;

        for (let i = 1; i < trackPoints.length; i++) {
          const startPoint = trackPoints[i - 1];
          const endPoint = trackPoints[i];
          const distance = geolib.getDistance(
            { latitude: startPoint.lat, longitude: startPoint.lon },
            { latitude: endPoint.lat, longitude: endPoint.lon }
          );

          totalDistance += distance / 1000;

          // Aggiungi la distanza accumulata alla serie dei dati del grafico
          chartDataValues.distance.push(totalDistance.toFixed(2));
          chartDataValues.elevation.push(Number(endPoint.elevation[0]));

          // Aggiungi i punti alla serie dei dati della mappa
          mapDataValues.push([endPoint.lat, endPoint.lon]);
        }

        //Recupera le previsioni meteo del luogo di partenza
        const apiKey = '93c5f3fac4dab200e93a517a80c89d08';
        const latitude = mapDataValues[0][0];
        const longitude = mapDataValues[0][1];

        // URL dell'API meteo per le previsioni a lungo termine
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=it`;

        // Effettua la richiesta GET all'API utilizzando fetch
        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            // Estrai le previsioni giornaliere per i prossimi giorni
            const dailyForecasts = {};
            const now = new Date().getTime() / 1000; // Timestamp attuale in secondi
            const city = data.city.name;
            for (const forecast of data.list) {
              // Verifica se il timestamp corrisponde a un giorno futuro
              if (forecast.dt >= now) {
                const date = new Date(forecast.dt * 1000); // Converti il timestamp in millisecondi
                const options = { weekday: 'short', day: 'numeric' };
                const day = date.toLocaleDateString('it-IT', options);

                if (!dailyForecasts[day]) {
                  dailyForecasts[day] = {
                    day: day,
                    temperature: forecast.main.temp,
                    descriptions: forecast.weather[0].main,
                  };
                }
              }
            }
            res.render('percorso', {
              citta: city,
              previsioniMeteo: dailyForecasts,
              chartData: chartDataValues,
              mapData: mapDataValues,
              datiPercorso: percorsospec,
              username: req.session.user
            });
          })
          .catch((error) => {
            console.error('Errore nella richiesta:', error);
          })
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Errore durante il recupero delle informazioni del percorso');
  }
});

router.post('/add-comment', async (req, res) => {
  try {
    const { percorsoId, comment } = req.body;

    // console.log('Richiesta POST ricevuta:', percorsoId, comment);
    // Esegui una query al database per ottenere le informazioni del percorso
    const percorsospec = await percorso.findById(percorsoId);


    // Crea un nuovo commento e salvalo nel database
    const newComment = { autore: req.session.user, testo: comment };

    percorsospec.commenti.push(newComment);
    await percorsospec.save();

    // Invia il nuovo commento come risposta JSON
    res.json(newComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Si è verificato un errore durante l\'aggiunta del commento.' });
  }
});


module.exports = router;