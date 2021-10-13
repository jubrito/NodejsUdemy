const User = require('../models/user');
const Post = require('../models/post');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jsonwebtoken = require('jsonwebtoken');

module.exports = {
    createUser: async function ({ userInput }, req) {
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({message: 'E-mail is invalid'});
        }
        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
            errors.push({ message: 'Password is too short'});
        }
        ;
        if (await userAlreadyExists(userInput.email)) {
            const error = new Error('User exists already!');
            throw error;
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const saltRoundsToHashPassword = 12;
        const hashedPassword = await bcrypt.hash(userInput.password, saltRoundsToHashPassword);
        const newUser = new User ({
            email: userInput.email,
            name: userInput.name,
            password: hashedPassword
        });
        const createdUser = await newUser.save();
        const idConvertedFromObjectId = createdUser._id.toString();
        return {
            ...createdUser._doc, // user data without mongoose metadata
            _id: idConvertedFromObjectId
        };
    },
    login: async function ({ email, password }) {
        const user = await User.findOne({ email: email });
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error;
        }
        const passwordMatched = await bcrypt.compare(password, user.password);
        if (!passwordMatched) {
            const error = new Error('Password is incorrect');
            error.statusCode = 401;
            throw error;
        }
        const privateKeyForAuthentication = 'privateKeyICreatedWhichIsUsedForSigningUpAndIsOnlyKnownToTheServerSoItCantBeFakeOnTheClient';
        const userId = user._id.toString();
        const jsonToken = jsonwebtoken.sign(
            {
                userId: userId,
                email: user.email
            }, 
            privateKeyForAuthentication,
            { expiresIn: '1h' }
        );
        return { token: jsonToken, userId: userId }
    },
    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error ('Not authenticated');
            error.statusCode = 401;
            throw error;
        }
        const errors = [];
        const minLenght = 5;
        if (validator.isEmpty(postInput.title) || validator.isLength(postInput.title, { min: minLenght })) {
            errors.push({ message: `Title must be at least ${minLenght} characters long`})
        }
        if (validator.isEmpty(postInput.content) || validator.isLength(postInput.content, { min: minLenght })) {
            errors.push({ message: `Content must be at least ${minLenght} characters long`})
        }
        if (errors.lenght > 0) {
            const error = new Error('Invalid input');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error('Invalid user');
            error.statusCode = 401;
            throw error;
        }
        const post = new Post ({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        });
        const newPost = await post.save();
        user.posts.push(newPost);
        await user.save();
        return { 
            ...newPost._doc, 
            _id: newPost._id.toString(),
            createdAt: newPost.createdAt.toISOString(),
            updatedAt: newPost.updatedAt.toISOString(),
        }
    },
    loadPosts: async function ({ currentPage, itemsPerPage }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.statusCode = 401;
            throw error;
        }
        if (!currentPage) {
            currentPage = 1;
        }
        if (!itemsPerPage) {
            itemsPerPage = 2;
        }
        const descendingWay = -1;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post
            .find()
            .populate('creator')
            .sort({ createdAt: descendingWay })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);
        return { posts: posts.map(post => {
            return {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
            }
        }), totalPosts: totalPosts };
    },
    loadPost: async function({ postId }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.statusCode = 401;
            throw error;
        }
        if (!postId) {
            const error = new Error('Could not find post');
            error.code = 404;
            throw error;
        }
        const post = await Post.findById(postId).populate('creator');
        if (!post) {
            const error = new Error('Could not find post');
            error.code = 404;
            throw error;
        }
        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
        }
    },
    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.statusCode = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error ('Could not find post');
            error.statusCode = 404;
            throw error;
        }
        const userIsAllowedToEditPost = post.creator._id.toString() === req.userId.toString();
        if (!userIsAllowedToEditPost) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        const errors = [];
        const minLenght = 5;
        if (validator.isEmpty(postInput.title) || validator.isLength(postInput.title, { min: minLenght })) {
            errors.push({ message: `Title must be at least ${minLenght} characters long`})
        }
        if (validator.isEmpty(postInput.content) || validator.isLength(postInput.content, { min: minLenght })) {
            errors.push({ message: `Content must be at least ${minLenght} characters long`})
        }
        if (errors.lenght > 0) {
            const error = new Error('Invalid input');
            error.data = errors;
            error.statusCode = 422;
            throw error;
        }
        post.title = postInput.title;
        post.content = postInput.content;
        post.imageUrl = postInput.imageUrl;
        if (postInput.imageUrl !== 'undefined'){
            post.imageUrl = postInput.imageUrl;
        }
        const updatedPost = await post.save();
        console.log('updatedPost')
        console.log(updatedPost)
        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString(),
        };
    }
}

async function userAlreadyExists(email) {
    const user = await User.findOne({ email: email });
    return user;
}