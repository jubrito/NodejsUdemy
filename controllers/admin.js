const Product = require('../models/product');
const { validationResult } = require('express-validator');

const UNPROCESSABLE_ENTITY_ERROR = 422; // VALIDATION FAILED
const INTERNAL_SERVER_ERROR = 422; // SERVER SIDE ISSUE OCCORUDE

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', { 
        pageTitle: 'Add Product', 
        path: '/admin/add-product',
        editIsEnabled: false,
        hasError: false,
        oldInputs: {
            title: '',
            imageUrl: '',
            price: '',
            description: ''
        },
        errorMessage: undefined,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    const product = new Product({
        title: title,
        price: price,
        description: description, 
        imageUrl: imageUrl,
        userId: req.user 
    });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(UNPROCESSABLE_ENTITY_ERROR).render(
            'admin/edit-product', { 
                pageTitle: 'Add Product', 
                path: '/admin/add-product',
                editIsEnabled: false,
                hasError: true,
                errorMessage: errors.array()[0].msg,
                product: {
                    title: title,
                    imageUrl: imageUrl,
                    price: price,
                    description: description
                },
                validationErrors: errors.array()
            }
        )
    }
    product
        .save()
        .then(result => {
            res.redirect('/admin/products');
        }).catch(error => {
            res.redirect('/500');
            // return res.status(INTERNAL_SERVER_ERROR).render(
            //     'admin/edit-product', { 
            //         pageTitle: 'Add Product', 
            //         path: '/admin/add-product',
            //         editIsEnabled: false,
            //         hasError: true,
            //         errorMessage: 'Database operation failed, please try again',
            //         product: {
            //             title: title,
            //             imageUrl: imageUrl,
            //             price: price,
            //             description: description
            //         },
            //         validationErrors: []
            //     }
            // )
        })
};

exports.getEditProduct = (req, res, next) => {
    const editIsEnabled = req.query.edit;
    const productId = req.params.productId;
    if (!editIsEnabled) {
        return res.redirect('/');
    }
    Product.findById(productId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit product',
                path: '/admin/edit-product',
                product: product,
                editIsEnabled: editIsEnabled,
                hasError: false,
                errorMessage: undefined,
                validationErrors: []
            })
        }).catch(error => {
            console.log(error);
        });
}


exports.postEditProduct = (req, res, next) => {
    const existingId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedImageUrl = req.body.imageUrl;
    const updatedPrice = req.body.price;
    const updatedDescription = req.body.description;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(UNPROCESSABLE_ENTITY_ERROR).render(
            'admin/edit-product', { 
                pageTitle: 'Add Product', 
                path: '/admin/edit-product',
                editIsEnabled: true,
                hasError: true,
                errorMessage: errors.array()[0].msg,
                product: {
                    _id: existingId,
                    title: updatedTitle,
                    imageUrl: updatedImageUrl,
                    price: updatedPrice,
                    description: updatedDescription
                },
                validationErrors: errors.array(),
            }
        )
    }
    Product
        .findById(existingId)
        .then(product => {
            const userHasPermission = product.userId.toString() === req.user._id.toString();
            if (!userHasPermission) {
                return res.redirect('/');
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDescription;
            product.imageUrl = updatedImageUrl;
            return product
                .save()
                .then(resultAfterSaving => {
                    res.redirect('/admin/products')
                });
        })
        .catch(error => { // catches errors for both promisses
            console.log(error);
        })
}

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id })
        // .select('title price -_id')
        // .populate('userId', 'name')
        .then(products => {
            res.render('admin/product-list', {
                products: products,
                pageTitle: 'Admin Product List',
                path: '/admin/products',
            });
        })
        .catch(error => {
            console.log(error);
        })
};

exports.postDeleteProduct = (req, res, next) => {
    const productId = req.body.productId;
    Product
        .deleteOne({
            _id: productId,
            userId: req.user._id
        })
        .then(resultAfterProductIsDestroyed => {
            res.redirect('/admin/products');
        })
        .catch(err => {
            console.log(err);
        });
}