const User = require('../models/user');
const { validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');

exports.signUp = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.errorsArray = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const strongStrength = 12;
    bcrypt
    .hash(password, strongStrength)
    .then(hashedPassword => {
        const user = new User({
            email: email,
            password: hashedPassword,
            name: name
        });
        return user.save();
    })
    .then(result => {
        res.status(201).json({ message: 'User created successfully', userId: result._id });
    })
    .catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let userFoundOnTheDatabaseWithLoginEmail;
    User
        .findOne({ email: email})
        .then(user => {
            if (!user) {
                const error = new Error('A user with this email could not be found');
                error.statusCode = 401; // not authenticated
                throw error;
            }
            userFoundOnTheDatabaseWithLoginEmail = user;
            return bcrypt.compare(password, user.password);
        })
        .then(userEnteredACorrectPassord => {
            if (!userEnteredACorrectPassord) {
                const error = new Error('Wrong password');
                error.statusCode = 401;
                throw error;
            }

        })
        .err(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}