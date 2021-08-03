const express = require('express');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/product');
const shopRoutes = require('./routes/shop');
const errorController = require('./controllers/error');

const database = require('./util/database'); // connection pool

// Get back promises when executing queries with execute
database.execute('SELECT * FROM products').then();

//  PARSE REQUEST BODY MIDDLEWARE 
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); 

app.use('/admin', adminRoutes); 
app.use(productRoutes); 
app.use(shopRoutes); 

app.use(errorController.get404);

app.listen(8080); 
