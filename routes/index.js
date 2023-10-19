var express = require('express');
var router = express.Router();

const User = require('../models/utenti');
const session = require('express-session');

// Configura la sessione per le login
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

//Per proteggere le rotte riservate si crea una funzione middleware che verifica 
//la session e dell'utente prima di consentire l'accesso alle pagine

function requireLogin(req, res, next) {
  if (req.session.user) {
    // L'utente è autenticato, inserisce il nome utente nelle variabili locali
    res.locals.user = req.session.user;
    next();
  } else {
    res.redirect('/login'); // Reindirizza alla pagina di login se l'utente non è autenticato
  }
}

function requireLoginHome(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    // res.redirect('/'); // Reindirizza alla pagina di login se l'utente non è autenticato
    res.render('homepage', { title: 'Home', messagelog: '' });
  }
}

// Pagina Home
router.get('/',function(req, res, next) {
  res.render('homepage', { title: 'Home', messagelog: '', username: req.session.user});
});

// Pagina Registrazione
router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Registrazione' });
});


// Pagina di registrazione - POST
router.post('/register', async function(req, res, next) {
  const { username, password } = req.body;

  try {
    // Cerca se il nome utente è già presente nel database
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      // Nome utente già presente, invia un messaggio di errore al client
      return res.render('register', { title: 'Registrazione', message: "Account già esistente" });
    }
    // Crea un nuovo utente nel database
    const nuovoUtente = new User({ username, password });

    // Salva l'utente nel database utilizzando una promessa
    await nuovoUtente.save();

    req.session.user = username;
    res.redirect('/');
    // res.render('homepage', {title: 'Home', messagelog: 'Accesso avvenuto con successo', username: username}); // Reindirizza alla homepage dopo la registrazione
  } catch (error) {
    console.error(error);
    res.redirect('/register'); // Reindirizza alla pagina di registrazione in caso di errore
  }
});


// Pagina Login
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login', messagelog: '' });
});

// Pagina di login - POST
router.post('/login', async function(req, res, next) {
  const { username, password } = req.body;

  try {
    // Cerca l'utente nel database
    const existingUser = await User.findOne({ username });

    // Verifica se l'utente esiste e la password è corretta
    if (existingUser && existingUser.password === password) {
      // Imposta la sessione dell'utente
      req.session.user = username;
      res.redirect('/'); // Reindirizza alla homepage dopo il login
    } else {
      res.render('login', {title: 'Login', messagelog: 'Credenziali errate'}); // Reindirizza alla pagina di login in caso di credenziali errate
    }
  } catch (error) {
    console.error(error);
    res.redirect('/login'); // Reindirizza alla pagina di login in caso di errore
  }
});

// Pagina di logout
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) {
      console.error(err);
    }
    res.redirect('/login'); // Reindirizza alla pagina di login dopo il logout
  });
});

// Pagina Contatti
router.get('/contatti', function(req, res, next) {
  if (req.session.user) {
    res.render('contatti', { title: 'Contatti', username: req.session.user });
  } else {
    // res.redirect('/'); // Reindirizza alla pagina di login se l'utente non è autenticato
    res.render('contatti', { title: 'Contatti'});
  }
  });
// Pagina Problemi
router.get('/problemi', function(req, res, next) {
  if (req.session.user) {
    res.render('problemi', { title: 'Problemi', username: req.session.user });
  } else {
    // res.redirect('/'); // Reindirizza alla pagina di login se l'utente non è autenticato
    res.render('problemi', { title: 'Problemi'});
  }
});
// Pagina Problemi
router.get('/calendario_gare', function(req, res, next) {
  if (req.session.user) {
    res.render('calendario_gare', { title: 'Calendario Gare', username: req.session.user });
  } else {
    // res.redirect('/'); // Reindirizza alla pagina di login se l'utente non è autenticato
    res.render('calendario_gare', { title: 'Calendario Gare'});
  }
});

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/gpx');
  },
  filename: function (req, file, cb) {
    // Usa il nome originale del file
    const ext = path.extname(file.originalname);
    const fileName = path.basename(file.originalname, ext);
    cb(null, fileName + ext);
  }
});

const upload = multer({ storage: storage });
const fs = require('fs');
//per calcolare le distanze dati latitudine e longitudine
const geolib = require('geolib');
const gpxParse = require('gpx-parse');
const Percorso = require('../models/percorso');

// Pagina di upload
router.get('/addGara', requireLogin, function(req, res, next) {
  res.render('addGara', { title: 'Aggiungi Gara', username: req.session.user });
});

// Elabora il modulo di upload
router.post('/addGara', upload.single('gpxfile'), function(req, res, next) {
  const gpxFile = req.file.path; // Percorso del file uploadato
  const descrizione = req.body.descrizione;
  const tipo = req.body.tipo; // Valore dalla prima select
  const categoria = req.body.categoria; // Valore dalla seconda select

  // Usa la funzione getGaraData per ottenere i dati dal file GPX
  const garaData = getGaraData(gpxFile);
  garaData.descrizione = descrizione;
  garaData.tipo = tipo;
  garaData.categoria = categoria;

  // Salva nel database utilizzando il modello mongoose
  const percorso = new Percorso(garaData);
  percorso.save();
  res.redirect('/');
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
          tipo: "",
          categoria: "",
          commenti:[],
        };
    } else {
      console.error('Errore nella lettura del file GPX:', error);
    }
  });
  return retData;
}


// Pagina di modifica percorso
router.get('/mod/:id', requireLogin, async function (req, res, next) {
  try {
    const percorsoId = req.params.id;
    const percorso = await Percorso.findById(percorsoId);

    if (!percorso) {
      return res.redirect('/');
    }

    res.render('editGara', { title: 'Modifica Percorso', percorso });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

// Elabora il modulo di modifica
router.post('/mod/:id', upload.single('gpxfile'), async function (req, res, next) {
  const percorsoId = req.params.id;
  const { descrizione, tipo, categoria, link } = req.body;

  try {
    const percorso = await Percorso.findByIdAndUpdate(
      percorsoId,
      {
        $set: {
          descrizione,
          tipo,
          categoria,
          link,
        },
      },
      { new: true }
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});


router.get('/download/:id', async function(req, res, next) {
  try {
    const gara = await Percorso.findById(req.params.id);

    if (!gara) {
      return res.status(404).send('File not found');
    }
    
    res.set('Content-Type', 'application/gpx+xml');
    res.set('Content-Disposition', `attachment; filename=${gara.nome}.gpx`);
    res.send(gara.data);
  } catch (error) {
    console.error('Errore durante il recupero del file dal database:', error);
    res.status(500).send('Internal Server Error');
  }
});



module.exports = router;
