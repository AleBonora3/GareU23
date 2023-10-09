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
router.get('/', requireLoginHome,function(req, res, next) {
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

module.exports = router;
