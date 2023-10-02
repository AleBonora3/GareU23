var createError = require('http-errors');

var express = require('express');
var app = express();


var path = require('path');

// Middleware per il logging delle richieste
var logger = require('morgan');
app.use(logger('dev'));

// Middleware per il parsing dei dati nelle richieste
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware per il parsing dei cookie
var cookieParser = require('cookie-parser');
app.use(cookieParser());

// Importa i router delle diverse rotte
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var percorsiRouter = require('./routes/percorsi');
var loadRouter = require('./routes/loadpercorsi');


// Associa i router alle relative rotte
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/percorsi', percorsiRouter);
app.use('/Alessio', loadRouter);


// Imposta il motore di rendering Pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


// Middleware per servire risorse statiche (CSS, JavaScript, immagini, ecc.)
app.use(express.static(path.join(__dirname, 'public')));



// Middleware per gestire errori 404
app.use(function(req, res, next) {
  next(createError(404));
});

// Middleware per gestire errori generici
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {title: "errore"});
});


// Middleware per gestire errori generici
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/GareDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Quindi, questa riga di codice si connette al database MongoDB specificato 
// nella stringa di connessione utilizzando Mongoose,
// con l'uso delle opzioni useNewUrlParser (implicitamente impostato su true) e 
// useUnifiedTopology: true per garantire una connessione robusta e moderna.


const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));

module.exports = app;
