const User = require("../models/user");
const bcryptjs = require('bcryptjs');
const nodemailer = require('nodemailer');

var nodemailerTransporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "7776a05245f738",
      pass: "921d80fe8128c9"
    }
  });


exports.getLogin = (req, res, next) => {
    var loginErrorMessage = req.flash('loginError');
    if (loginErrorMessage.length > 0) {
        loginErrorMessage = loginErrorMessage[0];
    } else {
        loginErrorMessage = false;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'login',
        errorMessage: loginErrorMessage
    })
}

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User
        .findOne({ email: email})
        .then(user => {
            if (!user) {
                req.flash('loginError', 'Invalid email or password');
                return res.redirect('/login');
            }
            bcryptjs
                .compare(password, user.password)
                .then(hashedPasswordIsEqualToFielPassword => {
                    if (hashedPasswordIsEqualToFielPassword) {
                        req.session.isAuthenticated = true;
                        req.session.user = user;
                        return req.session.save((err) => {
                            // make sure the session was created before you continue, so it doesn't redirect before updating the session
                            console.log(err);
                            res.redirect('/'); // with save we redirect only after creating the session
                        });
                    }
                    req.flash('loginError', 'Invalid email or password');
                    return res.redirect('/login');
                })
                .catch(err => {
                    res.redirect('/');
                    console.log(err);
                }) 
        }).catch(err => console.log(err));
}

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err);
        res.redirect('/');
    });
}

exports.getSignup = (req, res, next) => {
    var loginErrorMessage = req.flash('loginError');
    if (loginErrorMessage.length > 0) {
        loginErrorMessage = loginErrorMessage[0];
    } else {
        loginErrorMessage = false;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'signup',
        isAuthenticated: false, 
        errorMessage: loginErrorMessage
    })
}
exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    User
        .findOne({email: email})
        .then(userWithEmailThatAlreadyExists => {
            if (userWithEmailThatAlreadyExists) {
                req.flash('loginError', 'Email already exists. Choose a different one!');
                return res.redirect('/signup'); 
            }
            const howManyRoundsOfHashingWillBeAppliedToTheField = 12;// the higher the value the longer will take but the more secure it will be
            return bcryptjs
                .hash(password, howManyRoundsOfHashingWillBeAppliedToTheField)
                .then(hashedPassword => {
                const user = new User({
                    email: email,
                    password: hashedPassword,
                    cart: { items: [] }
                });
                return user.save();
            })
            .then(newUser => {
                res.redirect('/login');
                return nodemailerTransporter.sendMail({
                    from: 'jujubrito@outlook.com',
                    to: 'jujubrito@outlook.com',
                    subject: 'Sign up succeeded!',
                    html: '<h1>You successfully signed up!</h1>'
                });
            })
            .catch(err => {
                console.log(err);
            })
        })
        .catch(err => console.log(err));
}

exports.getResetPassword = (req, res, next) => {
    var resetPasswordErrorMessage = req.flash('loginError');
    if (resetPasswordErrorMessage.length > 0) {
        resetPasswordErrorMessage = resetPasswordErrorMessage[0];
    } else {
        resetPasswordErrorMessage = false;
    }
    res.render('auth/reset', {
        path: '/reset-password',
        pageTitle: 'Reset password',
        errorMessage: resetPasswordErrorMessage
    })
}